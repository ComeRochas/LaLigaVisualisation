// Liste des fichiers CSV
const seasons = [
    'season-0506.csv', 'season-0607.csv', 'season-0708.csv', 'season-0809.csv',
    'season-0910.csv', 'season-1011.csv', 'season-1112.csv', 'season-1213.csv',
    'season-1314.csv', 'season-1415.csv', 'season-1516.csv', 'season-1617.csv',
    'season-1718.csv', 'season-1819.csv', 'season-1920.csv', 'season-2021.csv',
    'season-2122.csv', 'season-2223.csv', 'season-2324.csv', 'season-2425.csv'
];

// Fonction pour charger un CSV
async function loadCSV(file) {
    const response = await fetch(`data/${file}`);
    const text = await response.text();
    return d3.csvParse(text);
}

// Charger toutes les données
async function loadAllData() {
    const promises = seasons.map(season => loadCSV(season));
    const dataArrays = await Promise.all(promises);
    return dataArrays.map((data, i) => ({
        season: seasons[i].replace('season-', '').replace('.csv', ''),
        data: data
    }));
}

// Calculer les buts totaux par saison
function calculateGoals(data) {
    return data.map(seasonData => {
        const totalGoals = seasonData.data.reduce((sum, match) => {
            return sum + parseInt(match.FTHG) + parseInt(match.FTAG);
        }, 0);
        return {
            season: seasonData.season,
            goals: totalGoals
        };
    });
}

// Créer le graphique
function createChart(goalsData) {
    const margin = {top: 20, right: 30, bottom: 40, left: 90};
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.top - margin.bottom;

    const svg = d3.select("#chart")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3.scaleLinear()
        .domain([0, d3.max(goalsData, d => d.goals)])
        .range([0, width]);

    const y = d3.scaleBand()
        .domain(goalsData.map(d => d.season))
        .range([0, height])
        .padding(0.1);

    svg.append("g")
        .call(d3.axisLeft(y));

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x));

    svg.selectAll(".bar")
        .data(goalsData)
        .enter().append("rect")
        .attr("class", "bar")
        .attr("y", d => y(d.season))
        .attr("height", y.bandwidth())
        .attr("x", 0)
        .attr("width", d => x(d.goals))
        .attr("fill", "steelblue");
}

// Fonction principale
async function main() {
    try {
        const allData = await loadAllData();
        const goalsData = calculateGoals(allData);
        createChart(goalsData);
    } catch (error) {
        console.error("Erreur lors du chargement des données:", error);
    }
}

main();