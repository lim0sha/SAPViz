import './styles/style.css';
import Papa from 'papaparse';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vScOT-7idyD-HQeYqKmBeh5ZrJoQVxtKpqY3NyQb1XkfSNHVWiLKMztAABkAJSiLURrGUZMT23MrEkD/pub?output=csv';
const COL_K1 = 16;
const COL_K2 = 17;
const COL_K3 = 18;
const COL_TRIP_NAME = 19;

function roundScore(val) {
    if (val < 1.6) return 1;
    if (val < 2.6) return 2;
    if (val < 3.6) return 3;
    if (val < 4.6) return 4;
    if (val < 5.6) return 5;
    return 6;
}

function fetchData() {
    return new Promise((resolve, reject) => {
        Papa.parse(SHEET_URL, {
            download: true,
            header: false,
            complete: (results) => {
                const rows = results.data.filter(row => row.length > 18 && !isNaN(parseFloat(row[COL_K1])));
                if (rows.length === 0) reject("Нет данных");

                const headers = results.data[0];
                const last = rows[rows.length - 1];
                const tripName = results.data[1] && results.data[1][COL_TRIP_NAME]
                    ? results.data[1][COL_TRIP_NAME]
                    : 'Название выезда';

                const raw1 = parseFloat(last[COL_K1]) || 0;
                const raw2 = parseFloat(last[COL_K2]) || 0;
                const raw3 = parseFloat(last[COL_K3]) || 0;

                resolve({
                    tripName: tripName,
                    levels: [
                        roundScore(raw1),
                        roundScore(raw2),
                        roundScore(raw3)
                    ],
                    percents: [
                        Math.round((raw1 / 6) * 100),
                        Math.round((raw2 / 6) * 100),
                        Math.round((raw3 / 6) * 100)
                    ],
                    labels: [
                        (headers[COL_K1] || "Критерий 1").toUpperCase(),
                        (headers[COL_K2] || "Критерий 2").toUpperCase(),
                        (headers[COL_K3] || "Критерий 3").toUpperCase()
                    ]
                });
            },
            error: (err) => reject(err)
        });
    });
}

async function init() {
    const canvas = document.getElementById('myChart');
    const ctx = canvas.getContext('2d');

    const size = 3000;
    canvas.width = size;
    canvas.height = size;

    try {
        const data = await fetchData();

        const tripNameElement = document.getElementById('trip-name');
        if (tripNameElement) {
            tripNameElement.textContent = data.tripName.toUpperCase();
        }

        const legend1 = document.getElementById('legend-1');
        const legend2 = document.getElementById('legend-2');
        const legend3 = document.getElementById('legend-3');
        if (legend1) legend1.textContent = data.labels[0];
        if (legend2) legend2.textContent = data.labels[1];
        if (legend3) legend3.textContent = data.labels[2];

        drawChart(ctx, size, data);
    } catch (err) {
        console.error(err);
    }
}

function drawChart(ctx, size, scores) {
    const centerX = size / 2;
    const centerY = size / 2;
    const totalLayers = 6;
    const layerThickness = 50;
    const gap = 30;

    const sectors = [
        { start: -0.5 * Math.PI, end: -0.5 * Math.PI + (Math.PI * 2 / 3), level: scores.levels[0], percent: scores.percents[0], label: scores.labels[0], index: 1 },
        { start: -0.5 * Math.PI + (Math.PI * 2 / 3), end: -0.5 * Math.PI + (Math.PI * 4 / 3), level: scores.levels[1], percent: scores.percents[1], label: scores.labels[1], index: 2 },
        { start: -0.5 * Math.PI + (Math.PI * 4 / 3), end: -0.5 * Math.PI + (Math.PI * 6 / 3), level: scores.levels[2], percent: scores.percents[2], label: scores.labels[2], index: 3 }
    ];

    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;

    const isMobile = window.innerWidth <= 768;

    sectors.forEach((sector) => {
        const angleSpan = sector.end - sector.start;
        const midAngle = sector.start + (angleSpan / 2);

        for (let i = 1; i <= totalLayers; i++) {
            if (i > sector.level) break;

            const innerRadius = (i - 1) * (layerThickness + gap);
            const outerRadius = innerRadius + layerThickness;

            ctx.beginPath();
            ctx.arc(centerX, centerY, outerRadius, sector.start, sector.end);
            ctx.arc(centerX, centerY, innerRadius, sector.end, sector.start, true);
            ctx.closePath();

            ctx.fillStyle = '#850000';
            ctx.fill();

            if (i === sector.level) {
                const textRadius = innerRadius + (outerRadius - innerRadius) / 2;
                const textX = centerX + Math.cos(midAngle) * textRadius;
                const textY = centerY + Math.sin(midAngle) * textRadius;

                ctx.fillStyle = '#e3e3e3';
                ctx.font = 'bold 75px "PublicGambolCyrillic", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.save();
                ctx.translate(textX, textY);

                let textAngle = midAngle + Math.PI / 2;
                if (textAngle > Math.PI / 2 && textAngle < 3 * Math.PI / 2) {
                    textAngle += Math.PI;
                }
                ctx.rotate(textAngle);

                ctx.fillText(sector.percent + '%', 0, 0);
                ctx.restore();

                const labelRadius = outerRadius + 250;
                const labelX = centerX + Math.cos(midAngle) * labelRadius;
                const labelY = centerY + Math.sin(midAngle) * labelRadius;

                ctx.fillStyle = '#e3e3e3';
                ctx.font = 'bold 52px "PublicGambolCyrillic", sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.save();
                ctx.translate(labelX, labelY);

                let labelAngle = midAngle + Math.PI / 2;
                if (labelAngle > Math.PI / 2 && labelAngle < 3 * Math.PI / 2) {
                    labelAngle += Math.PI;
                }
                ctx.rotate(labelAngle);

                if (isMobile) {
                    ctx.fillText(sector.index.toString(), 0, 0);
                } else {
                    ctx.fillText(sector.label, 0, 0);
                }

                ctx.restore();
            }
        }
    });
}

init().catch(console.error);