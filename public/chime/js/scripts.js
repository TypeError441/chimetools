import { set, get } from "/chime/js/idb-helper.js";

loadSettings();
migrate();

// Register sw
fetch(`/version.json`).then(response => response.json())
.then(data => {
    $(".version").text(`version ` + data.ver);
    navigator.serviceWorker.register(`/chime/sw.js?version=${data.ver}`);
    console.log("%cRegistered %csw.js.",
        "color: blue;",
        "color: black;"
    );
});

// Date variables
let now = new Date();
let currentDay = now.getDay();
let currentMonth = now.getMonth();
let currentDate = now.getDate();

// Schedule variables
let currentScheduleName;
let currentSchedule;

let scheduleOverrides = {"month-date": "schedule-name"}

let schedules;
let periods;
let calendar;

// Get school schedules and get current schedule, run tick()
if (await get("settings", "school") === undefined) await set("settings", "school", "egan");
console.log(`Got %cschool %cas %c${await get("settings", "school")}.`,
    "color: blue;",
    "color: black;",
    "color: green;"
);
fetch(`/chime/schools/${await get("settings", "school")}.json`).then(response => response.json())
.then(data => {
    schedules = data.schedules;
    periods = data.periods;
    calendar = data.calendar;
    
    currentScheduleName = calendar[currentDay]

    if (scheduleOverrides[`${currentMonth}-${currentDate}`]) currentScheduleName = scheduleOverrides[`${currentMonth}-${currentDate}`];

    currentSchedule = schedules[currentScheduleName];

    loadAvailableSchedulesToDropdown();
    $(".select-schedule").val(currentScheduleName);
    updatePeriodCountInSettings(periods);

    displaySchedule(currentSchedule);
    tick();
});

let sidebarOpened = false;

// JQuery events
$(".exit").click(function() { window.location.href = "/"; });

$(".right-sidebar-toggle,.mobile.right-sidebar-exit").click(function() {
    console.log("%cToggled %csidebar.",
        "color: blue;",
        "color: black;"
    );

    sidebarOpened = !sidebarOpened;
    $(".radial-timer").toggleClass("toggle-effect");
    $(".time-container").toggleClass("toggle-effect");
    $(".right-sidebar").toggleClass("toggle-effect");
    $(".right-sidebar-toggle").toggleClass("toggle-effect");
    $(".settings").toggleClass("toggle-effect");
    $(".mobile.settings-mobile").toggleClass("toggle-effect");
    $(".time").toggleClass("toggle-effect");
    $(".period").toggleClass("toggle-effect");
    $(".schedule").toggleClass("toggle-effect");
});

$(".settings,.mobile.settings-mobile").click(async function() {
    console.log("%cOpened %csettings.",
        "color: blue;",
        "color: black;"
    );

    $(".container").toggleClass("toggle-effect");
    $(".settings-container").toggleClass("toggle-effect");

    let theme = await get("settings", "theme");
    $(".select-theme").val(theme);
    $("html").attr("data-theme", theme);
    $(".select-font").val(await get("settings", "font"));

    let periods = await get("settings", "periods");
    $(".input-period#input-period-1").val(periods[0] || "Period 1");
    $(".input-period#input-period-2").val(periods[1] || "Period 2");
    $(".input-period#input-period-3").val(periods[2] || "Period 3");
    $(".input-period#input-period-4").val(periods[3] || "Period 4");
    $(".input-period#input-period-5").val(periods[4] || "Period 5");
    $(".input-period#input-period-6").val(periods[5] || "Period 6");
    $(".input-period#input-period-7").val(periods[6] || "Period 7");
});

$(".close-settings").click(function() {
    console.log("%cClosed %csettings.",
        "color: blue;",
        "color: black;"
    );
    $(".container").toggleClass("toggle-effect");
    $(".settings-container").toggleClass("toggle-effect");

    setTheme($(".select-theme").val());
    setFont($(".select-font").val());
    setPeriodNames($(".input-period#input-period-1").val(),
    $(".input-period#input-period-2").val(),
    $(".input-period#input-period-3").val(),
    $(".input-period#input-period-4").val(),
    $(".input-period#input-period-5").val(),
    $(".input-period#input-period-6").val(),
    $(".input-period#input-period-7").val());

    runLogic();

    displaySchedule(currentSchedule);
});

$(".select-schedule").change(function() {
    currentScheduleName = $(".select-schedule").val();
    currentSchedule = schedules[currentScheduleName];

    console.log(`Chose %c${currentScheduleName} %cas %cschedule.`,
        "color: blue;",
        "color: black;",
        "color: green;"
    );

    runLogic();

    displaySchedule(currentSchedule);
});

async function runLogic() {
    if (sidebarOpened && isMobile()) {
        console.log("Stopped %clogic %cdue to being on %cmobile.",
            "color: blue;",
            "color: black;",
            "color: green;"
        );
        return;
    }

    let time = getTime(currentSchedule);
    let parsedTime = parseTime(time);

    let period = getPeriod(currentSchedule);
    let parsedPeriod = await parsePeriod(period);

    let today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

    let favicon = getFaviconColor(parsedTime[1]);

    let percent = parsedTime[2];

    if (!$(".container").hasClass("toggle-effect")) updateUI(parsedTime[0], parsedPeriod, currentScheduleName, today, percent); // Run if not in settings
    updatePage(parsedTime[0], parsedPeriod, currentScheduleName, favicon)
}

function tick() {
    runLogic();

    setTimeout(tick, 1000);
}

// Loading functions
async function loadSettings() {
    if (await get("settings", "theme") === undefined) await set("settings", "theme", "default-light");
    if (await get("settings", "font") === undefined) await set("settings", "font", "'Inter', sans-serif");
    if (await get("settings", "periods") === undefined) await set("settings", "periods", ["Period 1", "Period 2", "Period 3", "Period 4", "Period 5", "Period 6", "Period 7"]);
    setTheme(await get("settings", "theme"));
    setFont(await get("settings", "font"));
}

async function migrate() {
    if (getQueryParam("theme") != null) await set("settings", "theme", getQueryParam("theme"));
    if (getQueryParam("font") != null) await set("settings", "font", getQueryParam("font"));
    if (window.location.search) history.pushState({}, "", window.location.pathname);
}

// Logic functions
async function setTheme(theme) {
    $("html").attr("data-theme", theme);
    await set("settings", "theme", theme);
}

async function setFont(font) {
    $(".time, .period, .schedule, .date").css("font-family", font);
    // schedule-item handled in displaySchedule()
    await set("settings", "font", font);
}

async function setPeriodNames(period1, period2, period3, period4, period5, period6, period7) {
    let periods = [period1, period2, period3, period4, period5, period6, period7];
    periods = periods.map(period => period.trim());

    for (let i = 0; i < periods.length; i++) { if (periods[i] === "") periods[i] = `Period ${i + 1}`; }

    await set("settings", "periods", periods);

}

function loadAvailableSchedulesToDropdown() {
    for (let key of Object.keys(schedules)) { $(".select-schedule").append(`<option value="${key}">${key}</option>`) }
    
    console.log("%cLoaded %cavailable schedules to dropdown.",
        "color: blue;",
        "color: black;"
    );
}

function updatePeriodCountInSettings(periods) {
    for (let i = 0; i < periods; i++) {
        $(".settings-column.periods > .settings-item").append(`
            <label class="label-input-periods" for="input-period-${i + 1}">Period ${i + 1}</label>
            <input maxlength="16" type="text" id="input-period-${i + 1}" class="input-period" value="Period ${i + 1}" placeholder="Period ${i + 1}">
        `);
    }

    console.log("%cUpdated %cperiod count in settings.",
        "color: blue;",
        "color: black;"
    );
}

async function displaySchedule(schedule) {
    $(".schedule-list").empty();

    let periods = await get("settings", "periods");

    for (const period of schedule) {
        let start = period.start;
        let end = period.end;
        let subject = period.subject;
        if (subject.startsWith("Period")) subject = periods[subject.split(" ")[1] - 1];

        let scheduleItem = `<tr style="font-family: ${await get("settings", "font")};" class="schedule-item ${getPeriod(schedule) === period ? 'current' : ''}${new Date().toTimeString().slice(0, 5) > end ? 'finished' : ''}">
            <td class="schedule-item-time">${start} - ${end}</td>
            <td class="schedule-item-name">${subject}</td>
        </tr>`;

        $(".schedule-list").append(scheduleItem);
    };

    console.log("%cDisplayed %cschedule in sidebar.",
        "color: blue;",
        "color: black;"
    );
}

function getTime(schedule) {
    let period = getPeriod(schedule);
    if (period === null) return null;

    let now = new Date();
    let end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), period.end.split(":")[0], period.end.split(":")[1], 0);
    let timeRemaining = end - now;
    let h = Math.floor(timeRemaining / (1000 * 60 * 60));
    let m = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));
    let s = Math.floor((timeRemaining % (1000 * 60)) / 1000);
    
    let pStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), period.start.split(":")[0], period.start.split(":")[1], 0);
    let pEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), period.end.split(":")[0], period.end.split(":")[1], 0);
    let d = pEnd - pStart; // Total time of period in milliseconds
    let t = pEnd - now; // Total time left in the period in milliseconds
    let p = t / d;

    return [h, m, s, t, p];
}

function parseTime(time) {
    if (time === null) return ["Free", null]; // Schedule is finished, return null for favicon
    let s = "";
    if (time[0] > 0) s += `${time[0].toString()}:`;
    s += `${time[1].toString().padStart(2, '0')}:${time[2].toString().padStart(2, '0')}`;

    return [s, time[3], time[4]];
}

function getPeriod(schedule) {
    let now = new Date();
    let currentTime = now.toTimeString().slice(0, 5);
    let currentPeriod = schedule.find(period => {
        return currentTime >= period.start && currentTime < period.end;
    });
    
    if (!currentPeriod) {
        let nextPeriod = schedule.find(period => period.start > currentTime);
        if (!nextPeriod) return null; // Schedule has ended for the day
        let previousPeriod = schedule[schedule.indexOf(nextPeriod) - 1];

        let passingPeriod = {
            start: previousPeriod.end,
            end: nextPeriod.start,
            subject: "Passing to " + nextPeriod.subject
        };

        return passingPeriod;
    }
    return currentPeriod;
}

async function parsePeriod(period) {
    if (period === null) return "School is over";

    let periodName = period ? period.subject : "Free";

    let periodNames = await get("settings", "periods");

    if (periodName === "Period 1") periodName = periodNames[0];
    else if (periodName === "Period 2") periodName = periodNames[1];
    else if (periodName === "Period 3") periodName = periodNames[2];
    else if (periodName === "Period 4") periodName = periodNames[3];
    else if (periodName === "Period 5") periodName = periodNames[4];
    else if (periodName === "Period 6") periodName = periodNames[5];
    else if (periodName === "Period 7") periodName = periodNames[6];

    return periodName;
}

function getFaviconColor(ms) {
    if (ms === null) return "gray";
    else if (ms >= 15 * 60 * 1000) return "green";
    else if (ms >= 5 * 60 * 1000) return "yellow";
    else if (ms >= 2 * 60 * 1000) return "orange";
    else return "red";
}

function updateUI(time, period, schedule, today, percent) {
    $(".time").text(time);
    $(".period").text(period);
    $(".schedule").text(schedule);
    $(".date").text(today);

    drawRadialTimer(percent * 100);
}

function updatePage(time, period, schedule, favicon) {
    if (!isMobile()) document.title = `${time} | ${period}, ${schedule}`;
    $(".favicon").attr("href", `/chime/lib/favicon/${favicon}.png`);
}

function drawRadialTimer(percent) {
    let cx = 100, cy = 100, r = 100;
    let d;

    if (percent >= 100) { // Full circle (2 arcs)
        d = `
            M${cx},${cy}
            L${cx},${cy - r}
            A${r},${r} 0 1,1 ${cx},${cy + r}
            A${r},${r} 0 1,1 ${cx},${cy - r}
            Z
        `;
    } else { // 1 arc
        let angle = percent / 100 * 360;
        let radians = (270 - angle) * (Math.PI / 180);

        let x = cx + r * Math.cos(radians);
        let y = cy + r * Math.sin(radians);

        let largeArcFlag = angle > 180 ? 1 : 0;

        d = `
            M${cx},${cy}
            L${cx},${cy - r}
            A${r},${r} 0 ${largeArcFlag},0 ${x},${y}
            Z
        `;
    }

    $(".radial-timer > path").attr("d", d);
    let mainColor = getComputedStyle(document.documentElement).getPropertyValue('--sidebar-background-color').trim();
    $(".radial-timer > path").attr("fill", mainColor);
}

function getQueryParam(key) { return new URLSearchParams(window.location.search).get(key); }

function isMobile() { return window.innerWidth <= 750; }