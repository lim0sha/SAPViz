import Papa from 'papaparse';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vScOT-7idyD-HQeYqKmBeh5ZrJoQVxtKpqY3NyQb1XkfSNHVWiLKMztAABkAJSiLURrGUZMT23MrEkD/pub?output=csv';

const COL_TRIP = 22;
const COL_K1 = 23;
const COL_K2 = 24;
const COL_K3 = 25;
const COL_SHOWING = 26;

function roundScore(val) {
    if (val < 1.6) return 1;
    if (val < 2.6) return 2;
    if (val < 3.6) return 3;
    if (val < 4.6) return 4;
    if (val < 5.6) return 5;
    return 6;
}

async function loadData() {
    return new Promise((resolve, reject) => {
        Papa.parse(SHEET_URL, {
            download: true,
            header: false,
            complete: (results) => {
                const rows = results.data.filter(row => row.length > COL_SHOWING);
                const data = [];

                for (let i = 1; i < rows.length; i++) {
                    const row = rows[i];
                    const showingValue = row[COL_SHOWING] ? parseInt(row[COL_SHOWING].trim()) : null;

                    if (showingValue && [1, 2, 3].includes(showingValue)) {
                        const raw1 = parseFloat(row[COL_K1]) || 0;
                        const raw2 = parseFloat(row[COL_K2]) || 0;
                        const raw3 = parseFloat(row[COL_K3]) || 0;

                        data.push({
                            trip: row[COL_TRIP] || 'Без названия',
                            levels: [roundScore(raw1), roundScore(raw2), roundScore(raw3)],
                            percents: [
                                Math.round((raw1 / 6) * 100),
                                Math.round((raw2 / 6) * 100),
                                Math.round((raw3 / 6) * 100)
                            ],
                            labels: [
                                (results.data[0][COL_K1] || 'Критерий 1').toUpperCase(),
                                (results.data[0][COL_K2] || 'Критерий 2').toUpperCase(),
                                (results.data[0][COL_K3] || 'Критерий 3').toUpperCase()
                            ],
                            position: showingValue
                        });
                    }
                }

                resolve(data);
            },
            error: (err) => reject(err)
        });
    });
}

function drawChart(canvas, scores, isMobile) {
    const ctx = canvas.getContext('2d');
    const size = canvas.width;
    const centerX = size / 2;
    const centerY = size / 2;
    const totalLayers = 6;
    const layerThickness = isMobile ? 10 : 15;
    const gap = isMobile ? 6 : 9;

    const sectors = [
        { start: -0.5 * Math.PI, end: -0.5 * Math.PI + (Math.PI * 2 / 3), level: scores.levels[0], percent: scores.percents[0], label: scores.labels[0], index: 1 },
        { start: -0.5 * Math.PI + (Math.PI * 2 / 3), end: -0.5 * Math.PI + (Math.PI * 4 / 3), level: scores.levels[1], percent: scores.percents[1], label: scores.labels[1], index: 2 },
        { start: -0.5 * Math.PI + (Math.PI * 4 / 3), end: -0.5 * Math.PI + (Math.PI * 6 / 3), level: scores.levels[2], percent: scores.percents[2], label: scores.labels[2], index: 3 }
    ];

    ctx.clearRect(0, 0, size, size);

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
                ctx.font = `bold ${isMobile ? 18 : 30}px "PublicGambolCyrillic", sans-serif`;
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

                const labelRadius = outerRadius + (isMobile ? 20 : 30);
                const labelX = centerX + Math.cos(midAngle) * labelRadius;
                const labelY = centerY + Math.sin(midAngle) * labelRadius;

                ctx.fillStyle = '#e3e3e3';
                ctx.font = `bold 14px "PublicGambolCyrillic", sans-serif`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';

                ctx.save();
                ctx.translate(labelX, labelY);
                let labelAngle = midAngle + Math.PI / 2;
                if (labelAngle > Math.PI / 2 && labelAngle < 3 * Math.PI / 2) {
                    labelAngle += Math.PI;
                }
                ctx.rotate(labelAngle);
                ctx.fillText(sector.label, 0, 0);
                ctx.restore();
            }
        }
    });
}

function createChartCard(data, isMobile) {
    const card = document.createElement('div');
    card.className = 'archive-chart-card';

    const title = document.createElement('h3');
    title.className = 'chart-trip-title';
    title.textContent = data.trip.toUpperCase();
    card.appendChild(title);

    const canvas = document.createElement('canvas');
    canvas.width = isMobile ? 350 : 450;
    canvas.height = isMobile ? 350 : 550;
    card.appendChild(canvas);

    drawChart(canvas, data, isMobile);

    return card;
}

async function initArchivePage() {
    const data = await loadData();
    const container = document.querySelector('.chart-stage');

    if (!container) return;

    const isMobile = window.innerWidth <= 768;

    const positions = { 1: null, 2: null, 3: null };
    data.forEach(item => {
        positions[item.position] = item;
    });

    if (positions[1]) {
        container.appendChild(createChartCard(positions[1], isMobile));
    }
    if (positions[2]) {
        container.appendChild(createChartCard(positions[2], isMobile));
    }
    if (positions[3]) {
        container.appendChild(createChartCard(positions[3], isMobile));
    }
}

window.addEventListener('DOMContentLoaded', initArchivePage);