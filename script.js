const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

let errorData = {}; // Error data storage
let robotNames = []; // Robot names storage
let currentRobot = null; // Currently selected robot

// Initialize chart variables
window.errorChart1 = null;
window.errorChart2 = null;

// Generate calendar
function generateCalendar(year, month = null) {
    const calendarContainer = document.getElementById('calendar');
    calendarContainer.innerHTML = '';
    if (month === null) {
        for (let m = 0; m < 12; m++) {
            createMonth(calendarContainer, m, year);
        }
    } else {
        createMonth(calendarContainer, month, year);
    }
}

// Create month view
function createMonth(calendarContainer, month, year) {
    const monthDiv = document.createElement('div');
    monthDiv.classList.add('month');

    const monthHeader = document.createElement('div');
    monthHeader.innerText = `${monthNames[month]} ${year}`;
    monthDiv.appendChild(monthHeader);

    const daysHeader = document.createElement('div');
    daysHeader.classList.add('week-header');
    weekDays.forEach(day => {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.innerText = day;
        daysHeader.appendChild(dayDiv);
    });
    monthDiv.appendChild(daysHeader);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysDiv = document.createElement('div');
    daysDiv.classList.add('days');

    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('empty');
        daysDiv.appendChild(emptyDiv);
    }

    for (let i = 1; i <= daysInMonth; i++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('day');
        dayDiv.innerText = i;

        const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        if (errorData[dateKey]) {
            dayDiv.classList.add('has-errors');
        }

        dayDiv.addEventListener('click', () => {
            displayCharts(year, month, i);
        });
        daysDiv.appendChild(dayDiv);
    }

    monthDiv.appendChild(daysDiv);
    calendarContainer.appendChild(monthDiv);
}

// Display charts
function displayCharts(year, month, day) {
    const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const data = errorData[dateKey];

    if (data) {
        document.getElementById('charts-container').style.display = 'flex';

        // Chart for error codes on the specific day (all robots)
        const errorChart1Context = document.getElementById('errorChart1').getContext('2d');
        if (window.errorChart1) window.errorChart1.destroy();

        const errorCodesDay = Object.entries(data.errorCodes);
        window.errorChart1 = new Chart(errorChart1Context, {
            type: 'pie',
            data: {
                labels: errorCodesDay.map(entry => `Error ${entry[0]}`),
                datasets: [{
                    data: errorCodesDay.map(entry => entry[1]),
                    backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4CAF50', '#FFC107']
                }]
            }
        });

        // Chart for error codes for the selected robot
        const errorChart2Context = document.getElementById('errorChart2').getContext('2d');
        if (window.errorChart2) window.errorChart2.destroy();

        if (currentRobot && data.robotErrors[currentRobot]) {
            const robotErrorCodes = Object.entries(data.robotErrors[currentRobot].errorCodes);
            window.errorChart2 = new Chart(errorChart2Context, {
                type: 'pie',
                data: {
                    labels: robotErrorCodes.map(entry => `Error ${entry[0]}`),
                    datasets: [{
                        data: robotErrorCodes.map(entry => entry[1]),
                        backgroundColor: ['#FF5733', '#33FF57', '#3357FF', '#FFC300', '#C70039']
                    }]
                }
            });
        } else {
            window.errorChart2 = new Chart(errorChart2Context, {
                type: 'pie',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        backgroundColor: []
                    }]
                },
                options: {
                    title: {
                        display: true,
                        text: 'No data available for the selected robot'
                    }
                }
            });
        }
    } else {
        alert('No data available for this date.');
    }
}

// Merge error data from JSON
function mergeErrorData(newData) {
    if (Array.isArray(newData)) {
        newData.forEach(item => {
            const robotId = item.robotId;
            if (!robotNames.includes(robotId)) {
                robotNames.push(robotId);
            }

            const dateKey = item.lastModifiedDate?.$date.split('T')[0];
            if (!errorData[dateKey]) {
                errorData[dateKey] = {
                    errorCodes: {}, // Count of error codes for the day
                    robotErrors: {} // Robot-specific errors for the day
                };
            }

            // Update error counts for the day
            errorData[dateKey].errorCodes[item.errorCode] = 
                (errorData[dateKey].errorCodes[item.errorCode] || 0) + 1;

            if (!errorData[dateKey].robotErrors[robotId]) {
                errorData[dateKey].robotErrors[robotId] = { errorCodes: {} };
            }
            errorData[dateKey].robotErrors[robotId].errorCodes[item.errorCode] = 
                (errorData[dateKey].robotErrors[robotId].errorCodes[item.errorCode] || 0) + 1;
        });
    }

    updateRobotSelector();
    generateCalendar(parseInt(document.getElementById('yearSelector').value));
}

// Update robot selector
function updateRobotSelector() {
    const robotSelector = document.getElementById('robotSelector');
    robotSelector.innerHTML = '';

    robotNames.forEach(robot => {
        const option = document.createElement('option');
        option.value = robot;
        option.innerText = robot;
        robotSelector.appendChild(option);
    });

    robotSelector.addEventListener('change', () => {
        currentRobot = robotSelector.value;
    });

    // Default to the first robot
    currentRobot = robotNames[0] || null;
}

// File upload and JSON parsing
document.getElementById('uploadButton').addEventListener('click', () => {
    document.getElementById('jsonFileUpload').click();
});

document.getElementById('jsonFileUpload').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                const jsonData = JSON.parse(e.target.result);
                mergeErrorData(Array.isArray(jsonData) ? jsonData : [jsonData]);
                alert('JSON file loaded successfully!');
            } catch {
                alert('Invalid JSON file.');
            }
        };
        reader.readAsText(file);
    }
});

// Year and month selection
document.getElementById('yearSelector').addEventListener('change', () => {
    const year = parseInt(document.getElementById('yearSelector').value);
    const month = document.getElementById('monthSelector').value;
    generateCalendar(year, month === '' ? null : parseInt(month));
});

document.getElementById('monthSelector').addEventListener('change', () => {
    const year = parseInt(document.getElementById('yearSelector').value);
    const month = document.getElementById('monthSelector').value;
    generateCalendar(year, month === '' ? null : parseInt(month));
});

// Initialize calendar
generateCalendar(2024);
