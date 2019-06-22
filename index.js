let update = false;
const breakPoint = 500;

function checkParameters() {
    const query = window.location;
    var url = new URL(query);
    const q = url.searchParams.get("q");

    if (q) {
        const string = atob(q);
        const split = string.split(/\,/g)

        const timeLeft = Number(split[0]);
        const secondStart = Number(split[1]);

        const positions = [];
        const breakPoints = [];
        let previousBreakPoint = 0;

        let prevData = null;
        for (let i = 2; i < split.length; i++) {
            const secs = secondStart + (i - 2) * 89;

            const data = { seconds: secs, position: Number(split[i]) };
            data.change = (prevData && prevData.position || data.position) - data.position

            if (data.change > (breakPoint + previousBreakPoint) || data.change < (-breakPoint + previousBreakPoint)) {
                previousBreakPoint = data.change;
                breakPoints.push(positions.length);
            }

            prevData = data;
            positions.push(data);
        }

        calculateEst(positions, breakPoints);
    }
}

function drop(e) {
    e.preventDefault();

    // Dropped text file
    const file = e.dataTransfer.items[0].getAsFile();
    
    const reader = new FileReader();
    reader.onload = event => {
        readFile(event.target.result);
        update = true;
    }

    reader.readAsText(file);
}

function allowDrop(e) {
    e.preventDefault();
}

function readFile(file) {
    // Split to each line and loop through tem 
    const lines = file.split(/\n/g);

    let positions = [];
    let breakPoints = [];
    let previousBreakPoint = 0;

    let prevData = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes("Login queue position")) {
            const data = handleLine(line);

            // If it has taken more than 60 seconds for a login queue update, add it to the graph
            // Fixes graph scewing up because of 2 -> 2 -> 89 second updates
            if ((prevData && (data.seconds - prevData.seconds) >= 60) || !prevData) {
                data.change = (prevData && prevData.position || data.position) - data.position
                
                if (data.change > (breakPoint + previousBreakPoint) || data.change < (-breakPoint + previousBreakPoint)) {
                    previousBreakPoint = data.change;
                    breakPoints.push(positions.length);
                }

                prevData = data;
                positions.push(data);
            }
        }
    }

    calculateEst(positions, breakPoints);
}

function handleLine(line) {
    const split = line.split(/\|/g);

    // Remove numbers at start, if there's any and just take the seconds
    // Milliseconds add unnecessary complexity in a queue that takes 20 hours anyway
    const seconds = split[0].replace(/^0{1,}/g, "").split(".")[0];
    const position = split[3].replace(" Login queue position is ", "").replace("\r", "");

    const data = {seconds, position};

    return data;
}

function calculateEst(data, breakPoints) {
    const last = data[data.length - 1];

    const delta = determineDelta(data, breakPoints);
    console.log(delta);

    const timeLeft = (delta <= 0) ? last.position / delta : null;
    console.log(timeLeft)

    let date = null
    if (timeLeft) {
        date = new Date(null);
        date.setSeconds(timeLeft);
    }

    const left = (date && date.toISOString().substr(11, 8)) || "Hold on, we're going up in the queue!";

    updateUI(last, left, timeLeft);
    createChart(data);
    createShareLink(data, timeLeft);
}

function determineDelta(data, breakPoints) {
    /* if (breakPoints.length > 20) {
        let prevPoint = 1
        
        let deltaSum = 0;
        for (let i = 1; i < breakPoints.length; i++) {
            const bP = breakPoints[i];
            
            console.log(data[prevPoint], data[bP - 1])
            deltaSum += calculateDelta(data[prevPoint], data[bP - 1]);
            prevPoint = bP;
        }


        return deltaSum / (breakPoints.length - 1);
    } */

    // console.log(data, data[0], data[data.length - 1])
    // If no shift points were found just take an average of the first and the last point
    return calculateDelta(data[0], data[data.length - 1]);
}

function calculateDelta(A, B) {
    console.log(A, B)

    const deltaPos = B.position - A.position;
    const deltaTime = B.seconds - A.seconds;

    return deltaPos / deltaTime;
}

function updateUI(last, left, timeLeft) {
    let date = null;

    if (timeLeft) {
        date = new Date();
        date.setSeconds(date.getSeconds() + timeLeft)
    }

    $("#pos")[0].innerText = `Login queue position: ${last.position}`;
    $("#est")[0].innerText = `Estimated time left in queue: ${left}`;
    $("#time")[0].innerText = `This means you'll be able to log in at: ${date && date.toString() || "Unable to give an accurate estimation while we're going up in the queue."}`
}

function createChart(dataPoints) {
    const quePosition = [];
    const queChange = [];

    const labels = [];

    dataPoints.forEach(t => {
        quePosition.push(t.position);
        queChange.push(t.change);

        labels.push(t.seconds);
    });

    const ctx = $("#chart")[0].getContext('2d');
    const chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Position in queue',
                fill: false,
				backgroundColor: 'rgba(0, 181, 204, 1)',
				borderColor: 'rgba(0, 181, 204, 1)',
                data: quePosition
            },
            {
                label: 'Positions changed',
                fill: false,
                backgroundColor: 'rgba(217, 30, 24, 1)',
                borderColor: 'rgba(217, 30, 24, 1)',
                data: queChange
            }]
        },
        options: {
            responsive: true,
            scales: {
                xAxes: [{
                    display: true,
                    scaleLabel: {
                        display: true,
                        labelString: 'Time taken in queue (seconds)'
                    }
                }],
                yAxes: [{
                    display: true,
                    scaleLabel: {
                        display: false,
                        labelString: 'Position in queue'
                    }
                }]
            }
        }
    })
}

function createShareLink(data, timeLeft) {
    const arr = [];

    arr.push(timeLeft);
    arr.push(data[0].seconds);

    for (let i = 0; i < data.length; i++) {
        const d = data[i];

        arr.push(d.position);
    }

    if (arr[arr.length - 1] != data[data.length - 1].position)
        arr.push(data[data.length - 1].position);

    const comp = btoa(arr)
    $("#share").val(`https://${window.location.host}${window.location.pathname.slice(0, -1)}?q=${comp}`)
}