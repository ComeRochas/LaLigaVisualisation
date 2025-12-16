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

function formatSeasonLabel(seasonCode) {
    // 0506 -> 2005/06
    const start = seasonCode.substring(0, 2);
    const end = seasonCode.substring(2, 4);
    return `'${start}/${end}`;
}



// --- Graphique 2 : Matrice d'Efficacité ---
function processEfficiencyData(seasonData) {
    const teams = {};

    seasonData.data.forEach(match => {
        const home = match.HomeTeam;
        const away = match.AwayTeam;

        if (!teams[home]) teams[home] = { name: home, goals: 0, shots: 0, points: 0, matches: 0 };
        if (!teams[away]) teams[away] = { name: away, goals: 0, shots: 0, points: 0, matches: 0 };

        teams[home].goals += parseInt(match.FTHG || 0);
        teams[home].shots += parseInt(match.HS || 0);
        teams[home].matches += 1;
        if (match.FTR === 'H') teams[home].points += 3;
        else if (match.FTR === 'D') teams[home].points += 1;

        teams[away].goals += parseInt(match.FTAG || 0);
        teams[away].shots += parseInt(match.AS || 0);
        teams[away].matches += 1;
        if (match.FTR === 'A') teams[away].points += 3;
        else if (match.FTR === 'D') teams[away].points += 1;
    });

    return Object.values(teams).map(team => ({
        name: team.name,
        goalsPerMatch: team.goals / team.matches,
        shotsPerMatch: team.shots / team.matches,
        totalPoints: team.points
    }));
}

function createEfficiencyChart(data) {
    const margin = {top: 40, right: 40, bottom: 50, left: 60};
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    let svg = d3.select("#efficiency-chart").select("svg");
    let g;

    if (svg.empty()) {
        svg = d3.select("#efficiency-chart")
            .append("svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%");
        
        g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
        g.append("g").attr("class", "y-axis");
        
        g.append("line").attr("class", "avg-x-line").attr("stroke", "#ccc").attr("stroke-dasharray", "4");
        g.append("line").attr("class", "avg-y-line").attr("stroke", "#ccc").attr("stroke-dasharray", "4");

        g.append("text").attr("x", width - 10).attr("y", 20).attr("text-anchor", "end").text("GÉANTS (Efficaces & Dominants)").style("fill", "#2ecc71").style("font-size", "10px").style("font-weight", "bold");
        g.append("text").attr("x", width - 10).attr("y", height - 10).attr("text-anchor", "end").text("GASPILLEURS (Dominants mais Stériles)").style("fill", "#e74c3c").style("font-size", "10px").style("font-weight", "bold");
        g.append("text").attr("x", 10).attr("y", 20).attr("text-anchor", "start").text("TUEURS (Pragmatiques)").style("fill", "#f39c12").style("font-size", "10px").style("font-weight", "bold");
        g.append("text").attr("x", 10).attr("y", height - 10).attr("text-anchor", "start").text("EN DIFFICULTÉ").style("fill", "#95a5a6").style("font-size", "10px").style("font-weight", "bold");

        g.append("text")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height + 40)
            .text("Tirs par match (Moyenne)")
            .style("fill", "#666");

        g.append("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", 0)
            .text("Buts par match (Moyenne)")
            .style("fill", "#666");
    } else {
        g = svg.select("g");
    }

    const x = d3.scaleLinear()
        .domain([d3.min(data, d => d.shotsPerMatch) * 0.9, d3.max(data, d => d.shotsPerMatch) * 1.1])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([d3.min(data, d => d.goalsPerMatch) * 0.9, d3.max(data, d => d.goalsPerMatch) * 1.1])
        .range([height, 0]);

    const z = d3.scaleLinear()
        .domain([d3.min(data, d => d.totalPoints), d3.max(data, d => d.totalPoints)])
        .range([5, 25]);

    const avgShots = d3.mean(data, d => d.shotsPerMatch);
    const avgGoals = d3.mean(data, d => d.goalsPerMatch);

    const t = d3.transition().duration(750);

    g.select(".x-axis").transition(t).call(d3.axisBottom(x));
    g.select(".y-axis").transition(t).call(d3.axisLeft(y));

    g.select(".avg-x-line").transition(t)
        .attr("x1", x(avgShots)).attr("x2", x(avgShots))
        .attr("y1", 0).attr("y2", height);

    g.select(".avg-y-line").transition(t)
        .attr("x1", 0).attr("x2", width)
        .attr("y1", y(avgGoals)).attr("y2", y(avgGoals));

    const tooltip = d3.select("body").selectAll(".tooltip-scatter").data([0]).join("div")
        .attr("class", "tooltip tooltip-scatter")
        .style("opacity", 0);

    // Update circles
    g.selectAll("circle")
        .data(data, d => d.name)
        .join(
            enter => enter.append("circle")
                .attr("cx", d => x(d.shotsPerMatch))
                .attr("cy", d => y(d.goalsPerMatch))
                .attr("r", 0)
                .style("fill", "#3498db")
                .style("opacity", 0.7)
                .style("stroke", "white")
                .call(enter => enter.transition(t)
                    .attr("r", d => z(d.totalPoints))),
            update => update.transition(t)
                .attr("cx", d => x(d.shotsPerMatch))
                .attr("cy", d => y(d.goalsPerMatch))
                .attr("r", d => z(d.totalPoints)),
            exit => exit.transition(t).attr("r", 0).remove()
        )
        .on("mouseover", function(event, d) {
            d3.select(this).style("opacity", 1).style("stroke", "#333");
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`
                <strong>${d.name}</strong><br/>
                Points: ${d.totalPoints}<br/>
                Buts/Match: ${d.goalsPerMatch.toFixed(2)}<br/>
                Tirs/Match: ${d.shotsPerMatch.toFixed(2)}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).style("opacity", 0.7).style("stroke", "white");
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // Update labels
    g.selectAll(".team-label")
        .data(data, d => d.name)
        .join(
            enter => enter.append("text")
                .attr("class", "team-label")
                .attr("x", d => x(d.shotsPerMatch))
                .attr("y", d => y(d.goalsPerMatch) - z(d.totalPoints) - 5)
                .text(d => d.name)
                .style("font-size", "10px")
                .style("fill", "#333")
                .style("text-anchor", "middle")
                .style("pointer-events", "none")
                .style("opacity", 0)
                .call(enter => enter.transition(t).style("opacity", 1)),
            update => update.transition(t)
                .attr("x", d => x(d.shotsPerMatch))
                .attr("y", d => y(d.goalsPerMatch) - z(d.totalPoints) - 5)
                .style("opacity", d => (Math.abs(d.shotsPerMatch - avgShots) > 2 || Math.abs(d.goalsPerMatch - avgGoals) > 0.5 || d.totalPoints > 80) ? 1 : 0),
            exit => exit.transition(t).style("opacity", 0).remove()
        );
}

// --- Graphique 3 : Bump Chart ---
function processRankingsData(allData) {
    const allRankings = [];
    const teamsSet = new Set();

    allData.forEach(seasonData => {
        const teams = {};
        
        seasonData.data.forEach(match => {
            const home = match.HomeTeam;
            const away = match.AwayTeam;

            if (!teams[home]) teams[home] = { name: home, points: 0, gd: 0, goals: 0 };
            if (!teams[away]) teams[away] = { name: away, points: 0, gd: 0, goals: 0 };

            const hg = parseInt(match.FTHG || 0);
            const ag = parseInt(match.FTAG || 0);

            teams[home].goals += hg;
            teams[home].gd += (hg - ag);
            
            teams[away].goals += ag;
            teams[away].gd += (ag - hg);

            if (match.FTR === 'H') teams[home].points += 3;
            else if (match.FTR === 'D') {
                teams[home].points += 1;
                teams[away].points += 1;
            } else if (match.FTR === 'A') teams[away].points += 3;
        });

        const sortedTeams = Object.values(teams).sort((a, b) => {
            if (b.points !== a.points) return b.points - a.points;
            if (b.gd !== a.gd) return b.gd - a.gd;
            return b.goals - a.goals;
        });

        sortedTeams.forEach((team, index) => {
            allRankings.push({
                season: formatSeasonLabel(seasonData.season),
                rawSeason: seasonData.season,
                team: team.name,
                rank: index + 1
            });
            teamsSet.add(team.name);
        });
    });

    const teamsData = Array.from(teamsSet).map(teamName => {
        return {
            name: teamName,
            values: allRankings.filter(d => d.team === teamName)
        };
    });

    return { teamsData, seasons: allData.map(d => formatSeasonLabel(d.season)) };
}

function createBumpChart(data) {
    d3.select("#bump-chart").selectAll("*").remove();

    const margin = {top: 40, right: 100, bottom: 50, left: 50};
    const width = 1000 - margin.left - margin.right;
    const height = 600 - margin.top - margin.bottom;

    const svg = d3.select("#bump-chart")
        .append("svg")
        .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
        .attr("preserveAspectRatio", "xMidYMid meet")
        .style("width", "100%")
        .style("height", "100%")
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    const seasons = data.seasons;
    
    const x = d3.scalePoint()
        .domain(seasons)
        .range([0, width])
        .padding(0.5);

    const y = d3.scaleLinear()
        .domain([1, 20])
        .range([0, height]);

    const teamColors = {
        "Real Madrid": "#ecf0f1",
        "Barcelona": "#DB0030",
        "Ath Madrid": "#CB3524",
        "Valencia": "#F39C12",
        "Sevilla": "#D35400",
        "Villarreal": "#F1C40F",
        "Sociedad": "#3498DB"
    };
    
    const defaultColor = "#bdc3c7";

    const line = d3.line()
        .defined(d => d.rank <= 20)
        .x(d => x(d.season))
        .y(d => y(d.rank))
        .curve(d3.curveMonotoneX);

    const lines = svg.selectAll(".bump-line")
        .data(data.teamsData)
        .enter()
        .append("path")
        .attr("class", "bump-line")
        .attr("d", d => line(d.values))
        .style("stroke", d => teamColors[d.name] || defaultColor)
        .style("stroke-opacity", d => teamColors[d.name] ? 1 : 0.3)
        .style("stroke-width", d => teamColors[d.name] ? 4 : 1.5)
        .style("fill", "none");

    const pointsGroup = svg.selectAll(".points-group")
        .data(data.teamsData)
        .enter()
        .append("g")
        .attr("class", "points-group");

    pointsGroup.selectAll("circle")
        .data(d => d.values.filter(v => v.rank <= 20))
        .enter()
        .append("circle")
        .attr("class", "bump-circle")
        .attr("cx", d => x(d.season))
        .attr("cy", d => y(d.rank))
        .attr("r", 3)
        .style("fill", d => teamColors[d.team] || defaultColor)
        .style("opacity", d => teamColors[d.team] ? 1 : 0.5);

    svg.append("g")
        .attr("transform", `translate(0,${height})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("transform", "rotate(-45)");

    svg.append("g")
        .call(d3.axisLeft(y).ticks(20));

    const tooltip = d3.select("body").selectAll(".tooltip-bump").data([0]).join("div")
        .attr("class", "tooltip tooltip-bump")
        .style("opacity", 0)
        .style("position", "absolute")
        .style("background", "#000000CC")
        .style("color", "white")
        .style("padding", "5px")
        .style("border-radius", "4px")
        .style("pointer-events", "none")
        .style("font-size", "12px");

    svg.selectAll(".hover-line")
        .data(data.teamsData)
        .enter()
        .append("path")
        .attr("d", d => line(d.values))
        .style("stroke", "transparent")
        .style("stroke-width", 15)
        .style("fill", "none")
        .style("cursor", "pointer")
        .on("mouseover", function(event, d) {
            lines.style("stroke-opacity", 0.1).style("stroke", "#bdc3c7").style("stroke-width", 1);
            svg.selectAll(".bump-circle").style("opacity", 0.1);

            const selectedLine = lines.filter(l => l.name === d.name);
            selectedLine
                .style("stroke-opacity", 1)
                .style("stroke", teamColors[d.name] || "#3498db")
                .style("stroke-width", 5)
                .raise();

            pointsGroup.filter(p => p.name === d.name)
                .selectAll("circle")
                .style("opacity", 1)
                .style("fill", teamColors[d.name] || "#3498db")
                .attr("r", 5);

            tooltip.transition().duration(100).style("opacity", 0.9);
            tooltip.html(`<strong>${d.name}</strong>`)
                .style("left", (event.pageX + 10) + "px")
                .style("top", (event.pageY - 28) + "px");
        })
        .on("mousemove", function(event) {
            tooltip.style("left", (event.pageX + 10) + "px")
                   .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function(event, d) {
            lines
                .style("stroke", d => teamColors[d.name] || defaultColor)
                .style("stroke-opacity", d => teamColors[d.name] ? 1 : 0.3)
                .style("stroke-width", d => teamColors[d.name] ? 4 : 1.5);
            
            svg.selectAll(".bump-circle")
                .style("fill", d => teamColors[d.team] || defaultColor)
                .style("opacity", d => teamColors[d.team] ? 1 : 0.5)
                .attr("r", 3);

            tooltip.transition().duration(500).style("opacity", 0);
        });
}

// Fonction principale
async function main() {
    try {
        const allData = await loadAllData();
        
        const globalSlider = document.getElementById('global-season-slider');
        const globalLabel = document.getElementById('global-season-label');

        // Configurer le slider
        globalSlider.max = allData.length - 1;
        globalSlider.value = allData.length - 1; // Commencer par la dernière saison

        function updateAllCharts() {
            const selectedIndex = globalSlider.value;
            const seasonData = allData[selectedIndex];
            
            // Mettre à jour le label
            globalLabel.textContent = formatSeasonLabel(seasonData.season);

            // Mettre à jour le graphique d'efficacité
            const efficiencyData = processEfficiencyData(seasonData);
            createEfficiencyChart(efficiencyData);

            // Mettre à jour le graphique des cartons
            const cardsData = processCardsFoulsData(seasonData);
            createCardsFoulsChart(cardsData);
        }

        globalSlider.addEventListener('input', updateAllCharts);
        
        // Initialisation
        const rankingsData = processRankingsData(allData);
        createBumpChart(rankingsData);
        updateAllCharts();

    } catch (error) {
        console.error("Erreur lors du chargement des données:", error);

    }
}

main();

// --- Graphique 4 : Cartons vs Fautes ---

function processCardsFoulsData(seasonData) {
    const teams = {};

    seasonData.data.forEach(match => {
        const home = match.HomeTeam;
        const away = match.AwayTeam;

        if (!teams[home]) teams[home] = { name: home, fouls: 0, cards: 0, goalsConceded: 0 };
        if (!teams[away]) teams[away] = { name: away, fouls: 0, cards: 0, goalsConceded: 0 };

        // Fautes
        teams[home].fouls += parseInt(match.HF || 0);
        teams[away].fouls += parseInt(match.AF || 0);

        // Cartons (Jaunes + Rouges)
        teams[home].cards += parseInt(match.HY || 0) + parseInt(match.HR || 0);
        teams[away].cards += parseInt(match.AY || 0) + parseInt(match.AR || 0);

        // Buts encaissés
        teams[home].goalsConceded += parseInt(match.FTAG || 0);
        teams[away].goalsConceded += parseInt(match.FTHG || 0);
    });

    return Object.values(teams);
}

function createCardsFoulsChart(data) {
    const margin = {top: 40, right: 40, bottom: 50, left: 60};
    const width = 800 - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    let svg = d3.select("#cards-chart").select("svg");
    let g;

    if (svg.empty()) {
        svg = d3.select("#cards-chart")
            .append("svg")
            .attr("viewBox", `0 0 ${width + margin.left + margin.right} ${height + margin.top + margin.bottom}`)
            .attr("preserveAspectRatio", "xMidYMid meet")
            .style("width", "100%")
            .style("height", "100%");
        
        g = svg.append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);

        g.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`);
        g.append("g").attr("class", "y-axis");
        
        g.append("line").attr("class", "median-x-line").attr("stroke", "#999").attr("stroke-dasharray", "4").style("opacity", 0.5);
        g.append("line").attr("class", "median-y-line").attr("stroke", "#999").attr("stroke-dasharray", "4").style("opacity", 0.5);

        g.append("text").attr("x", width - 10).attr("y", 20).attr("text-anchor", "end").text("BRUTES (Agressifs)").style("fill", "#e74c3c").style("font-size", "10px").style("font-weight", "bold");
        g.append("text").attr("x", width - 10).attr("y", height - 10).attr("text-anchor", "end").text("VICTIMES (Sévères)").style("fill", "#e67e22").style("font-size", "10px").style("font-weight", "bold");
        g.append("text").attr("x", 10).attr("y", 20).attr("text-anchor", "start").text("ROUBLARDS (Tactiques)").style("fill", "#f1c40f").style("font-size", "10px").style("font-weight", "bold");
        g.append("text").attr("x", 10).attr("y", height - 10).attr("text-anchor", "start").text("GENTLEMEN (Propres)").style("fill", "#2ecc71").style("font-size", "10px").style("font-weight", "bold");

        g.append("text")
            .attr("text-anchor", "end")
            .attr("x", width)
            .attr("y", height + 40)
            .text("Total Cartons (Jaunes + Rouges)")
            .style("fill", "#666");

        g.append("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-90)")
            .attr("y", -40)
            .attr("x", 0)
            .text("Total Fautes")
            .style("fill", "#666");
    } else {
        g = svg.select("g");
    }

    // Echelles (Inversées : X=Cartons, Y=Fautes)
    const x = d3.scaleLinear()
        .domain([d3.min(data, d => d.cards) * 0.9, d3.max(data, d => d.cards) * 1.1])
        .range([0, width]);

    const y = d3.scaleLinear()
        .domain([d3.min(data, d => d.fouls) * 0.9, d3.max(data, d => d.fouls) * 1.1])
        .range([height, 0]);

    // Taille inversement proportionnelle aux buts encaissés
    const minGC = d3.min(data, d => d.goalsConceded);
    const maxGC = d3.max(data, d => d.goalsConceded);
    
    const z = d3.scaleLinear()
        .domain([maxGC, minGC]) // Max GC -> Petite taille, Min GC -> Grande taille
        .range([5, 20]);

    // Médianes
    const medianFouls = d3.median(data, d => d.fouls);
    const medianCards = d3.median(data, d => d.cards);

    const t = d3.transition().duration(750);

    g.select(".x-axis").transition(t).call(d3.axisBottom(x));
    g.select(".y-axis").transition(t).call(d3.axisLeft(y));

    g.select(".median-x-line").transition(t)
        .attr("x1", x(medianCards)).attr("x2", x(medianCards))
        .attr("y1", 0).attr("y2", height);

    g.select(".median-y-line").transition(t)
        .attr("x1", 0).attr("x2", width)
        .attr("y1", y(medianFouls)).attr("y2", y(medianFouls));

    const tooltip = d3.select("body").selectAll(".tooltip-cards").data([0]).join("div")
        .attr("class", "tooltip tooltip-cards")
        .style("opacity", 0);

    // Points
    g.selectAll("circle")
        .data(data, d => d.name)
        .join(
            enter => enter.append("circle")
                .attr("cx", d => x(d.cards))
                .attr("cy", d => y(d.fouls))
                .attr("r", 0)
                .style("fill", "#e74c3c")
                .style("opacity", 0.7)
                .style("stroke", "white")
                .call(enter => enter.transition(t)
                    .attr("r", d => z(d.goalsConceded))),
            update => update.transition(t)
                .attr("cx", d => x(d.cards))
                .attr("cy", d => y(d.fouls))
                .attr("r", d => z(d.goalsConceded)),
            exit => exit.transition(t).attr("r", 0).remove()
        )
        .on("mouseover", function(event, d) {
            d3.select(this).style("opacity", 1).style("stroke", "#333");
            tooltip.transition().duration(200).style("opacity", 0.9);
            tooltip.html(`
                <strong>${d.name}</strong><br/>
                Fautes: ${d.fouls}<br/>
                Cartons: ${d.cards}<br/>
                Buts Encaissés: ${d.goalsConceded}
            `)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY - 28) + "px");
        })
        .on("mouseout", function() {
            d3.select(this).style("opacity", 0.7).style("stroke", "white");
            tooltip.transition().duration(500).style("opacity", 0);
        });

    // Labels pour les équipes extrêmes
    g.selectAll(".team-label")
        .data(data, d => d.name)
        .join(
            enter => enter.append("text")
                .attr("class", "team-label")
                .attr("x", d => x(d.cards))
                .attr("y", d => y(d.fouls) - z(d.goalsConceded) - 5)
                .text(d => d.name)
                .style("font-size", "10px")
                .style("fill", "#333")
                .style("text-anchor", "middle")
                .style("pointer-events", "none")
                .style("opacity", 0)
                .call(enter => enter.transition(t).style("opacity", 1)),
            update => update.transition(t)
                .attr("x", d => x(d.cards))
                .attr("y", d => y(d.fouls) - z(d.goalsConceded) - 5)
                .style("opacity", d => (Math.abs(d.fouls - medianFouls) > 50 || Math.abs(d.cards - medianCards) > 15 || d.goalsConceded === minGC) ? 1 : 0),
            exit => exit.transition(t).style("opacity", 0).remove()
        );
}