function checkParameters() {
    const query = window.location;
    var url = new URL(query);
    const q = url.searchParams.get("q");

    if (q) {
        const string = atob(q);
        const split = string.split(/\,/g)

        const timeLeft = Number(split[0]);
        const secondStart = Number(split[1]);
        const data = [];

        for (let i = 2; i < split.length; i++) {
            const secs = secondStart + (i - 2) * 193;

            data.push({ seconds: secs, position: Number(split[i]) });
        }

        const date = new Date(null);
        date.setSeconds(timeLeft);

        const left = date.toISOString().substr(11, 8);

        updateUI({ position: data[data.length - 1].position }, left, timeLeft);
        createChart(data);
    }
}

function drop(e) {
    e.preventDefault();

    // Dropped text file
    const file = e.dataTransfer.items[0].getAsFile();
    
    const reader = new FileReader();
    reader.onload = event => {
        readFile(event.target.result);
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
    let average = 0;
    
    let prevData = null;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes("Login queue position")) {
            const data = handleLine(line);

            // If it has taken more than 60 seconds for a login queue update, add it to the graph
            // Fixes graph scewing up because of 2 -> 2 -> 89 second updates
            if (prevData)
                console.log(data.seconds - prevData.seconds)

            if ((prevData && (data.seconds - prevData.seconds) > 60) || !prevData) {
                prevData = data;
                positions.push(data);
            }
        }
    }

    calculateEst(positions);
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

function calculateEst(data) {
    const first = data[0];
    const last = data[data.length - 1];

    // Calculate how many positions we have moved since joining
    const deltaPos = first.position - last.position;

    // Calculate for how long we've been in the queue (in seconds)
    const deltaTime = last.seconds - first.seconds;

    const delta = deltaPos / deltaTime;

    const timeLeft = last.position / delta;
    const date = new Date(null);
    date.setSeconds(timeLeft);

    const left = date.toISOString().substr(11, 8);

    updateUI(last, left, timeLeft);
    createChart(data);
    createShareLink(data, timeLeft);
}

function updateUI(last, left, timeLeft) {
    const date = new Date();
    date.setSeconds(date.getSeconds() + timeLeft)

    $("#pos")[0].innerText = `Login queue position: ${last.position}`;
    $("#est")[0].innerText = `Estimated time left in queue: ${left}`;
    $("#time")[0].innerText = `This means you'll be able to log in at: ${date.toString()}`
}

function createChart(dataPoints) {
    const data = [];
    const labels = [];

    dataPoints.forEach(t => {
        data.push(t.position);
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
                data: data
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
                        display: true,
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

    for (let i = 0; i < data.length; i+=2) {
        const d = data[i];

        arr.push(d.position);
    }

    if (arr[arr.length - 1] != data[data.length - 1].position)
        arr.push(data[data.length - 1].position);

    const comp = btoa(arr)

    $("#share").val(`https://${window.location.host}${window.location.pathname.slice(0, -1)}?q=${comp}`)
}