/* ==========================================================
   FINAL AAM-HWCs DAILY PERFORMANCE REPORT ENGINE

   IMPORTANT BUSINESS RULES IMPLEMENTED:
   1. Reads the two raw Excel files directly in browser.
   2. Consultation calculations use COMPLETED, never TOTAL.
   3. Ref_SC rows are counted only when Health Facility starts with "SC".
   4. Active AAM [B] = exact Daily Formula COUNTIF logic.
   5. Active AAM [Z] = exact COUNTIFS logic with Completed >= 10.
   6. Spoke consultation [E] = exact SUMIF logic on Completed.
   7. Non-AAM spoke consultation = exact SUM of Ref_OTSC Completed.
   8. Hub consultation [F] = exact SUMIF of the named district HUB.
   9. Active Doctors = exact COUNTIF of matching HUB rows.
   10. Expected Doctors = ROUND(Operational AAM / 5, 0).
   11. Four individual ranks use Excel-style descending RANK.EQ.
   12. Composite Score = average of the four ranks.
   13. Overall Rank = ascending rank of Composite Score.
   14. Report is automatically sorted by Overall Rank.
   15. Rank colours: 1-10 green, 11-21 peach, 22-28 red.
   ========================================================== */

"use strict";

const APP = {
    rows: [],
    generated: false,
    reportDate: null,
    auxSheets: {},
    summary: null
};

/* ==========================================================
   OPERATIONAL AAM MASTER
   Taken from the workbook's "Daily Formula" / operational
   configuration used by the report.
   ========================================================== */

const DISTRICTS = [
    { zone: "IV", district: "Alipurduar", op: 276 },
    { zone: "V", district: "Bankura", op: 388 },
    { zone: "I", district: "Basirhat", op: 320 },
    { zone: "III", district: "Birbhum", op: 269 },
    { zone: "V", district: "Bishnupur", op: 152 },
    { zone: "IV", district: "COOCHBEHAR", op: 386 },
    { zone: "VI", district: "Dakshin Dinajpur", op: 234 },
    { zone: "IV", district: "Darjeeling GTA", op: 67 },
    { zone: "IV", district: "Darjeeling SMP", op: 75 },
    { zone: "I", district: "Diamond Harbour", op: 431 },
    { zone: "III", district: "Hoogly", op: 589 },
    { zone: "I", district: "Howrah", op: 409 },
    { zone: "IV", district: "Jalpaiguri", op: 263 },
    { zone: "II", district: "Jhargram", op: 206 },
    { zone: "IV", district: "Kalimpong", op: 33 },
    { zone: "VI", district: "Malda", op: 491 },
    { zone: "VI", district: "Murshidabad", op: 672 },
    { zone: "VI", district: "NADIA", op: 439 },
    { zone: "II", district: "Nandigram", op: 277 },
    { zone: "I", district: "North 24 Parganas", op: 398 },
    { zone: "V", district: "Paschim Bardhaman", op: 169 },
    { zone: "II", district: "Paschim Medinipore", op: 693 },
    { zone: "III", district: "Purba Bardhaman", op: 583 },
    { zone: "II", district: "Purba Medinipore", op: 452 },
    { zone: "V", district: "Purulia", op: 423 },
    { zone: "III", district: "Rampurhat", op: 225 },
    { zone: "I", district: "South 24 Parganas", op: 544 },
    { zone: "VI", district: "Uttar Dinajpur", op: 344 }
];

/* ==========================================================
   DISTRICT NORMALISATION
   ========================================================== */

const DISTRICT_ALIASES = {
    "ALIPURDUAR": "Alipurduar",
    "BANKURA": "Bankura",
    "BASIRHAT": "Basirhat",
    "BIRBHUM": "Birbhum",
    "BISHNUPUR": "Bishnupur",
    "COOCHBEHAR": "COOCHBEHAR",
    "COOCH BEHAR": "COOCHBEHAR",
    "DAKSHIN DINAJPUR": "Dakshin Dinajpur",
    "DINAJPUR DAKSHIN": "Dakshin Dinajpur",
    "UTTAR DINAJPUR": "Uttar Dinajpur",
    "DINAJPUR UTTAR": "Uttar Dinajpur",

    "DARJEELING GTA": "Darjeeling GTA",
    "DARJEELING SMP": "Darjeeling SMP",
    "DARJEELING": "Darjeeling GTA",

    "DIAMOND HARBOUR": "Diamond Harbour",
    "HOOGHLY": "Hoogly",
    "HOOGHLY": "Hoogly",
    "HOWRAH": "Howrah",
    "JALPAIGURI": "Jalpaiguri",
    "JHARGRAM": "Jhargram",
    "KALIMPONG": "Kalimpong",
    "MALDA": "Malda",
    "MALDAH": "Malda",
    "MURSHIDABAD": "Murshidabad",
    "NADIA": "NADIA",
    "NANDIGRAM": "Nandigram",

    "24 PARAGANAS NORTH": "North 24 Parganas",
    "NORTH 24 PARGANAS": "North 24 Parganas",

    "PASCHIM BARDHAMAN": "Paschim Bardhaman",
    "PASCHIM BURDWAN": "Paschim Bardhaman",

    "PASCHIM MEDINIPORE": "Paschim Medinipore",
    "MEDINIPUR WEST": "Paschim Medinipore",
    "PASCHIM MEDINIPUR": "Paschim Medinipore",

    "PURBA BARDHAMAN": "Purba Bardhaman",
    "PURBA BURDWAN": "Purba Bardhaman",

    "PURBA MEDINIPORE": "Purba Medinipore",
    "MEDINIPUR EAST": "Purba Medinipore",

    "PURULIA": "Purulia",
    "RAMPURHAT": "Rampurhat",

    "24 PARAGANAS SOUTH": "South 24 Parganas",
    "SOUTH 24 PARGANAS": "South 24 Parganas"
};

/* Exact main HUB facility names used by the Excel report. */
const HUB_FACILITY_MAP = {
    "Alipurduar": "HUB ALIPURDUAR",
    "Bankura": "HUB BANKURA",
    "Basirhat": "HUB BASIRHAT",
    "Birbhum": "HUB BIRBHUM",
    "Bishnupur": "HUB BISHNUPUR",
    "COOCHBEHAR": "HUB COOCH BEHAR",
    "Dakshin Dinajpur": "HUB DAKSHIN DINAJPUR",
    "Darjeeling GTA": "HUB DARJEELING GTA",
    "Darjeeling SMP": "HUB DARJEELING SMP",
    "Diamond Harbour": "HUB DIAMOND HARBOUR",
    "Hoogly": "HUB HOOGHLY",
    "Howrah": "HUB HOWRAH",
    "Jalpaiguri": "HUB JALPAIGURI",
    "Jhargram": "HUB JHARGRAM",
    "Kalimpong": "HUB KALIMPONG",
    "Malda": "HUB MALDAH",
    "Murshidabad": "HUB MURSHIDABAD",
    "NADIA": "HUB NADIA",
    "Nandigram": "HUB NANDIGRAM",
    "North 24 Parganas": "HUB NORTH TWENTY FOUR PRGS",
    "Paschim Bardhaman": "HUB PASCHIM BURDWAN",
    "Paschim Medinipore": "HUB PASCHIM MEDINIPUR",
    "Purba Bardhaman": "HUB PURBA BURDWAN",
    "Purba Medinipore": "HUB PURBA MEDINIPUR",
    "Purulia": "HUB PURULIA",
    "Rampurhat": "HUB RAMPURHAT",
    "South 24 Parganas": "HUB SOUTH TWENTY FOUR PRGS",
    "Uttar Dinajpur": "HUB UTTAR DINAJPUR"
};

/* ==========================================================
   STARTUP
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    setDefaultDate();
    startLiveClock();

    document.getElementById("file1").addEventListener("change", e => {
        const file = e.target.files[0];
        showFileName("file1Name", file);
        autoSelectReportDate(file);
    });

    document.getElementById("file2").addEventListener("change", e => {
        const file = e.target.files[0];
        showFileName("file2Name", file);
        autoSelectReportDate(file);
    });

    document.getElementById("generateBtn").addEventListener("click", generateReport);
    document.getElementById("resetBtn").addEventListener("click", resetApplication);

    const bindClick = (id, handler) => {
        const el = document.getElementById(id);
        if (el) el.addEventListener("click", handler);
    };

    bindClick("pdfBtn", exportPDF);
    bindClick("excelBtn", exportExcel);
    bindClick("pngBtn", exportPNG);
    bindClick("followUpBtn", toggleFollowUpAnalytics);
    bindClick("followUpClose", hideFollowUpAnalytics);
});

/* ==========================================================
   DATE
   ========================================================== */

function setDefaultDate() {
    const input = document.getElementById("reportDate");

    if (!input.value) {
        const d = new Date();

        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");

        input.value = `${yyyy}-${mm}-${dd}`;
    }
}

function formatLongDate(value) {
    if (!value) return "--";

    const d = new Date(value + "T00:00:00");

    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });
}

function formatFileDate(name) {
    if (!name) return null;

    const text = String(name).replace(/\.[^.]+$/, "");
    let match;
    let day;
    let month;
    let year;

    // 1) DD-MM-YYYY / DD_MM_YYYY / DD.MM.YYYY
    match = text.match(/(^|[^\d])(\d{1,2})[-_.](\d{1,2})[-_.](\d{2,4})(?!\d)/);
    if (match) {
        day = Number(match[2]);
        month = Number(match[3]);
        year = Number(match[4]);
    } else {
        // 2) YYYY-MM-DD / YYYY_MM_DD / YYYY.MM.DD
        match = text.match(/(^|[^\d])(\d{4})[-_.](\d{1,2})[-_.](\d{1,2})(?!\d)/);
        if (match) {
            year = Number(match[2]);
            month = Number(match[3]);
            day = Number(match[4]);
        } else {
            // 3) DD Month YYYY / DD-Month-YYYY / DD Month, YYYY
            const months = {
                jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
                apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
                aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10,
                october: 10, nov: 11, november: 11, dec: 12, december: 12
            };
            match = text.match(/(^|[^\d])(\d{1,2})[\s._-]+([A-Za-z]+)[\s,._-]+(\d{4})(?!\d)/i);
            if (match && months[match[3].toLowerCase()]) {
                day = Number(match[2]);
                month = months[match[3].toLowerCase()];
                year = Number(match[4]);
            }
        }
    }

    if (!day || !month || !year) return null;
    if (year < 100) year += 2000;

    // Validate the actual calendar date, not just the ranges.
    const candidate = new Date(year, month - 1, day);
    if (candidate.getFullYear() !== year || candidate.getMonth() !== month - 1 || candidate.getDate() !== day) {
        return null;
    }

    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function autoSelectReportDate(file) {
    if (!file) return;

    const detectedDate = formatFileDate(file.name);
    if (!detectedDate) return;

    const input = document.getElementById("reportDate");
    if (!input) return;

    // Set the report date immediately when a raw file is selected.
    // This removes the need to click Generate before the date is populated.
    input.value = detectedDate;
    APP.reportDate = detectedDate;

    const status = document.getElementById("status");
    if (status) {
        status.innerHTML = `Report date automatically selected: <strong>${formatLongDate(detectedDate)}</strong>`;
        status.className = "status info";
    }
}

/* ==========================================================
   FILE HELPERS
   ========================================================== */

function showFileName(targetId, file) {
    const el = document.getElementById(targetId);

    if (!file) {
        el.textContent = "No file selected";
        return;
    }

    el.textContent = `${file.name} • ${(file.size / 1024).toFixed(1)} KB`;
}

async function readExcelFile(file) {

    if (!file) {
        throw new Error("File not selected.");
    }

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
        type: "array",
        cellDates: true
    });

    if (!workbook.SheetNames.length) {
        throw new Error(`No worksheet found in ${file.name}`);
    }

    const sheets = {};

    workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];

        sheets[sheetName] = XLSX.utils.sheet_to_json(sheet, {
            defval: "",
            raw: false
        });
    });

    /*
     * Keep the original app behaviour for the two main uploads:
     * prefer a sheet named "Data", otherwise use the first sheet.
     */
    const primarySheetName =
        workbook.SheetNames.find(
            s => String(s).trim().toLowerCase() === "data"
        ) || workbook.SheetNames[0];

    return {
        primary: sheets[primarySheetName] || [],
        sheets
    };
}

/* ==========================================================
   GENERATE
   ========================================================== */

async function generateReport() {

    const referredFile = document.getElementById("file1").files[0];
    const receivedFile = document.getElementById("file2").files[0];

    if (!referredFile || !receivedFile) {
        setStatus(
            "Please select BOTH raw Excel files before generating the report.",
            "error"
        );
        return;
    }

    try {

        setLoading(true, "Reading the two uploaded Excel files...");

        const [referredBook, receivedBook] = await Promise.all([
            readExcelFile(referredFile),
            readExcelFile(receivedFile)
        ]);

        const referredRows = referredBook.primary;
        const receivedRows = receivedBook.primary;

        /*
         * Keep auxiliary XLSM-equivalent sheets when they are present
         * inside either uploaded workbook. This lets the browser apply
         * the exact Daily Formula formulas for Ref_OTSC and
         * Rece_UPHCHUB instead of deriving them by subtraction.
         */
        APP.auxSheets = {
            ...referredBook.sheets,
            ...receivedBook.sheets
        };

        if (!referredRows.length) {
            throw new Error("The Referred file contains no data rows.");
        }

        if (!receivedRows.length) {
            throw new Error("The Received file contains no data rows.");
        }

        /* The upload handlers normally select the report date immediately.
         * Keep filename detection here as a safe fallback for programmatic
         * uploads or browsers that do not fire the change handler as expected. */
        let dateValue = document.getElementById("reportDate").value;

        const filenameDate =
            formatFileDate(referredFile.name) ||
            formatFileDate(receivedFile.name);

        if (filenameDate) {
            dateValue = filenameDate;
            document.getElementById("reportDate").value = filenameDate;
        }

        APP.reportDate = dateValue;

        setLoading(true, "Calculating district-wise performance from COMPLETED consultations...");

        APP.rows = buildDistrictMetrics(referredRows, receivedRows);

        renderReport(APP.rows, referredRows, receivedRows);

        APP.generated = true;

        document.getElementById("reportSection").classList.remove("hidden");

        setButtonDisabled("pdfBtn", false);
        setButtonDisabled("excelBtn", false);
        setButtonDisabled("pngBtn", false);
        setButtonDisabled("followUpBtn", false);

        setStatus(
            `Report generated successfully • ${APP.rows.length} districts • Sorted by Overall Rank.`,
            "success"
        );

        setLoading(false);

        setTimeout(() => {
            document.getElementById("reportSection").scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
        }, 100);

    } catch (error) {

        console.error(error);

        setLoading(false);

        setStatus(
            `Unable to generate report: ${error.message}`,
            "error"
        );
    }
}

/* ==========================================================
   DISTRICT METRICS
   ========================================================== */

function buildDistrictMetrics(referredRows, receivedRows) {

    /*
     * IMPORTANT:
     * This section mirrors the formulas in the XLSM "Daily Formula"
     * sheet exactly. The source columns are:
     * Ref_SC : A=Health Facility, B=District, C=User, D=Total,
     *          E=Completed, F=In Process
     * Rece_  : A=Health Facility, B=District, C=User, D=Total,
     *          E=Completed, F=In Process
     */

    const metrics = DISTRICTS.map(d => ({
        zone: d.zone,
        district: d.district,
        opAAM: d.op,

        activeAAM: 0,          // B
        activeAAM10: 0,        // Z
        expectedDoctors: Math.round(d.op / 5), // C
        activeDoctors: 0,      // D
        spokeConsult: 0,       // E
        hubConsult: 0,         // F

        pctActiveAAM: 0,       // G
        pctAvailability: 0,    // K
        consultPerAAM: 0,      // N
        consultPerDoctor: 0,   // Q

        rankActiveAAM: 0,      // H
        rankAvailability: 0,  // L
        rankSpoke: 0,          // O
        rankHub: 0,            // R

        compositeScore: 0,     // U
        overallRank: 0
    }));

    const metricMap = new Map(
        metrics.map(m => [normalizeDistrictKey(m.district), m])
    );

    /*
     * Exact Excel COUNTIF/SUMIF/COUNTIFS criteria from rows 5:32
     * of the XLSM Daily Formula sheet.
     *
     * B / Z / E all use Ref_SC column B or the special Ref_SC
     * column A wildcard rules shown in the workbook.
     */
    const spokeCriteria = {
        "Alipurduar": r => equalsExcel(r.facilityDistrict, "Alipurduar"),
        "Bankura": r =>
            equalsExcel(r.facilityDistrict, "Bankura") &&
            !containsExcel(r.facility, "BSNPR"),
        "Basirhat": r => containsExcel(r.facility, "Basirhat"),
        "Birbhum": r =>
            equalsExcel(r.facilityDistrict, "Birbhum") &&
            !containsExcel(r.facility, "Rampurhat"),
        "Bishnupur": r => containsExcel(r.facility, "BSNPR"),
        "COOCHBEHAR": r => equalsExcel(r.facilityDistrict, "COOCHBEHAR"),
        "Dakshin Dinajpur": r =>
            equalsExcel(r.facilityDistrict, "DINAJPUR DAKSHIN"),
        "Darjeeling GTA": r => containsExcel(r.facility, "Darjeeling GTA"),
        "Darjeeling SMP": r => containsExcel(r.facility, "Darjeeling SMP"),
        "Diamond Harbour": r =>
            containsExcel(r.facility, "Diamond Harbour"),
        "Hoogly": r => equalsExcel(r.facilityDistrict, "Hooghly"),
        "Howrah": r => equalsExcel(r.facilityDistrict, "Howrah"),
        "Jalpaiguri": r => equalsExcel(r.facilityDistrict, "Jalpaiguri"),
        "Jhargram": r => equalsExcel(r.facilityDistrict, "Jhargram"),
        "Kalimpong": r => equalsExcel(r.facilityDistrict, "Kalimpong"),
        "Malda": r => equalsExcel(r.facilityDistrict, "Maldah"),
        "Murshidabad": r => equalsExcel(r.facilityDistrict, "Murshidabad"),
        "NADIA": r => equalsExcel(r.facilityDistrict, "NADIA"),
        "Nandigram": r => containsExcel(r.facility, "Nandigram"),
        "North 24 Parganas": r =>
            equalsExcel(r.facilityDistrict, "24 PARAGANAS NORTH") &&
            !containsExcel(r.facility, "Basirhat"),
        "Paschim Bardhaman": r =>
            equalsExcel(r.facilityDistrict, "Paschim Bardhaman"),
        "Paschim Medinipore": r =>
            equalsExcel(r.facilityDistrict, "MEDINIPUR WEST"),
        "Purba Bardhaman": r =>
            equalsExcel(r.facilityDistrict, "Purba Bardhaman"),
        "Purba Medinipore": r =>
            equalsExcel(r.facilityDistrict, "Medinipur East") &&
            !containsExcel(r.facility, "Nandigram"),
        "Purulia": r => equalsExcel(r.facilityDistrict, "Purulia"),
        "Rampurhat": r => containsExcel(r.facility, "Rampurhat"),
        "South 24 Parganas": r =>
            equalsExcel(r.facilityDistrict, "24 PARAGANAS SOUTH") &&
            !containsExcel(r.facility, "Diamond Harbour"),
        "Uttar Dinajpur": r =>
            equalsExcel(r.facilityDistrict, "Dinajpur Uttar")
    };

    /*
     * Ref_SC source rows.
     * The workbook's B formula is COUNTIF/COUNTIF-with-exclusion,
     * NOT a distinct-doctor count and NOT a "completed > 0" count.
     */
    referredRows.forEach(row => {

        const source = {
            facility: getField(row, [
                "Health Facility", "Facility", "HealthFacility"
            ]),
            facilityDistrict: getField(row, [
                "District", "District Name"
            ]),
            completed: getCompleted(row)
        };

        /*
         * Explicit user requirement:
         * count only Health Facility values starting with "SC".
         */
        if (!startsWithSC(source.facility)) return;

        for (const metric of metrics) {

            const criterion = spokeCriteria[metric.district];

            if (!criterion || !criterion(source)) continue;

            /*
             * B = COUNTIF(...)
             */
            metric.activeAAM += 1;

            /*
             * Z = COUNTIFS(..., Ref_SC!E:E, ">=10")
             */
            if (source.completed >= 10) {
                metric.activeAAM10 += 1;
            }

            /*
             * E = SUMIF(...) using Ref_SC column E (Completed).
             */
            metric.spokeConsult += source.completed;
        }
    });

    /*
     * Exact HUB criteria from the XLSM Daily Formula sheet.
     *
     * J = COUNTIF(Rece_!A:A, exact HUB name)
     * P = SUMIF(Rece_!A:A, exact HUB name, Rece_!E:E)
     *
     * Excel COUNTIF/SUMIF are case-insensitive, so comparisons below
     * are normalized to uppercase.
     */
    const hubCriteria = {
        "Alipurduar": "HUB ALIPURDUAR",
        "Bankura": "HUB BANKURA",
        "Basirhat": "HUB BASIRHAT",
        "Birbhum": "HUB BIRBHUM",
        "Bishnupur": "HUB BISHNUPUR",
        "COOCHBEHAR": "HUB Cooch behar",
        "Dakshin Dinajpur": "HUB Dakshin Dinajpur",
        "Darjeeling GTA": "HUB Darjeeling GTA",
        "Darjeeling SMP": "HUB Darjeeling SMP",
        "Diamond Harbour": "HUB diamond Harbour",
        "Hoogly": "HUB Hooghly",
        "Howrah": "HUB howrah",
        "Jalpaiguri": "HUB Jalpaiguri",
        "Jhargram": "HUB Jhargram",
        "Kalimpong": "HUB Kalimpong",
        "Malda": "HUB Maldah",
        "Murshidabad": "HUB Murshidabad",
        "NADIA": "HUB NADIA",
        "Nandigram": "HUB Nandigram",
        "North 24 Parganas": "HUB NORTH TWENTY FOUR PRGS",
        "Paschim Bardhaman": "HUB Paschim burdwan",
        "Paschim Medinipore": "HUB Paschim Medinipur",
        "Purba Bardhaman": "HUB purba burdwan",
        "Purba Medinipore": "HUB purba Medinipur",
        "Purulia": "HUB Purulia",
        "Rampurhat": "HUB Rampurhat",
        "South 24 Parganas": "HUB SOUTH TWENTY FOUR PRGS",
        "Uttar Dinajpur": "HUB Uttar Dinajpur"
    };

    receivedRows.forEach(row => {

        const facility = getField(row, [
            "Health Facility", "Facility", "HealthFacility"
        ]);

        const completed = getCompleted(row);

        for (const metric of metrics) {

            const exactHub = hubCriteria[metric.district];

            if (!exactHub || !equalsExcel(facility, exactHub)) {
                continue;
            }

            /*
             * J = COUNTIF(Rece_!$A:$A, "HUB ...")
             * Every matching row counts, irrespective of Completed.
             */
            metric.activeDoctors += 1;

            /*
             * P = SUMIF(Rece_!$A:$A, "HUB ...", Rece_!$E:$E)
             */
            metric.hubConsult += completed;
        }
    });

    /*
     * Exact derived formulas from the workbook:
     *
     * G = F / D
     * K = J / I
     * N = ROUND(M / D, 0)
     * Q = P / J
     */
    metrics.forEach(metric => {

        metric.pctActiveAAM =
            metric.opAAM > 0
                ? metric.activeAAM10 / metric.opAAM
                : 0;

        // Doctor Availability % = J11 / I11 * 100
        // Do NOT cap at 100%. Example: 9 active / 7 expected = 128.57%.
        metric.pctAvailability =
            metric.expectedDoctors > 0
                ? (metric.activeDoctors / metric.expectedDoctors) * 100
                : 0;

        metric.consultPerAAM =
            metric.opAAM > 0
                ? Math.round(metric.spokeConsult / metric.opAAM)
                : 0;

        metric.consultPerDoctor =
            metric.activeDoctors > 0
                ? metric.hubConsult / metric.activeDoctors
                : 0;
    });

    /*
     * Exact Excel RANK.EQ(..., range) behaviour for the four
     * component ranks: descending, with ties sharing a rank.
     */
    assignExcelCompetitionRanks(metrics, "pctActiveAAM", "rankActiveAAM", "desc");
    assignExcelCompetitionRanks(metrics, "pctAvailability", "rankAvailability", "desc");
    assignExcelCompetitionRanks(metrics, "consultPerAAM", "rankSpoke", "desc");
    assignExcelCompetitionRanks(metrics, "consultPerDoctor", "rankHub", "desc");

    /*
     * V/U composite formula:
     * =0.25*H + 0.25*L + 0.25*O + 0.25*R
     */
    metrics.forEach(metric => {
        metric.compositeScore =
            0.25 * metric.rankActiveAAM +
            0.25 * metric.rankAvailability +
            0.25 * metric.rankSpoke +
            0.25 * metric.rankHub;
    });

    /*
     * Excel's Overall Rank formula is:
     * =RANK.EQ(CompositeScore, U$5:U$32, 1)
     *
     * The dashboard requirement is also to DISPLAY a unique
     * 1..28 sequence. We therefore first reproduce the Excel
     * composite ordering, then resolve ties only for presentation.
     */
    assignExcelCompetitionRanks(
        metrics,
        "compositeScore",
        "_excelOverallRank",
        "asc"
    );

    metrics.sort((a, b) => {

        if (a.compositeScore !== b.compositeScore) {
            return a.compositeScore - b.compositeScore;
        }

        if (a._excelOverallRank !== b._excelOverallRank) {
            return a._excelOverallRank - b._excelOverallRank;
        }

        return String(a.district).localeCompare(
            String(b.district),
            undefined,
            { sensitivity: "base" }
        );
    });

    metrics.forEach((metric, index) => {
        metric.overallRank = index + 1;
        delete metric._excelOverallRank;
    });

    /*
     * Summary totals follow the workbook's row 33 formulas.
     */
    const totalSpokeAAM = metrics.reduce(
        (sum, m) => sum + m.spokeConsult,
        0
    );

    const totalReferred = referredRows.reduce(
        (sum, row) => sum + getCompleted(row),
        0
    );

    const totalHub = metrics.reduce(
        (sum, m) => sum + m.hubConsult,
        0
    );

    /*
     * HUB PERFORMANCE — use the uploaded Received/Referred Summary rows
     * directly, following the requested column logic.
     *
     * 1) MCH / State Telemedicine Center / Super Specialist Center:
     *    Received Summary District = KOLKATA, while excluding every
     *    Health Facility beginning with "HUB UPHC" (including HUB UPHC Kolkata).
     *
     * 2) AAM–UPHC HUB:
     *    Received Summary Health Facility beginning with "HUB UPHC".
     *
     * 3) Consultation from Spoke other than AAMs:
     *    Referred Summary Health Facility NOT beginning with "SC".
     *
     * These are direct filters on the uploaded summaries and are not
     * calculated by subtraction or by using the auxiliary XLSM sheets.
     */
    const mch = sumCompletedByDistrictExcludingFacilityPrefix(
        receivedRows,
        "KOLKATA",
        "HUB UPHC"
    );

    const uphc = sumCompletedByFacilityPrefix(
        receivedRows,
        "HUB UPHC"
    );

    const otherSpoke = sumCompletedByFacilityNotStartingWith(
        referredRows,
        "SC"
    );

    APP.summary = {
        totalSpokeAAM,
        totalReferred,
        otherSpoke,
        totalHub,
        totalReceived: receivedRows.reduce(
            (sum, row) => sum + getCompleted(row),
            0
        ),
        mch,
        uphc
    };

    return metrics;
}

function sumCompletedRows(rows) {
    return (Array.isArray(rows) ? rows : []).reduce(
        (sum, row) => sum + getCompleted(row),
        0
    );
}

function sumCompletedByDistrict(rows, districtName) {
    return (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
        const district = getField(row, [
            "District", "District Name"
        ]);

        return sum +
            (equalsExcel(district, districtName)
                ? getCompleted(row)
                : 0);
    }, 0);
}

function sumCompletedByDistrictExcludingFacilityPrefix(
    rows,
    districtName,
    excludedFacilityPrefix
) {
    return (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
        const district = getField(row, [
            "District", "District Name"
        ]);

        const facility = getField(row, [
            "Health Facility", "Facility", "HealthFacility"
        ]);

        if (!equalsExcel(district, districtName)) return sum;
        if (startsWithExcel(facility, excludedFacilityPrefix)) return sum;

        return sum + getCompleted(row);
    }, 0);
}

function sumCompletedByFacilityPrefix(rows, prefix) {
    return (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
        const facility = getField(row, [
            "Health Facility", "Facility", "HealthFacility"
        ]);

        return sum +
            (startsWithExcel(facility, prefix)
                ? getCompleted(row)
                : 0);
    }, 0);
}

function sumCompletedByFacilityNotStartingWith(rows, prefix) {
    return (Array.isArray(rows) ? rows : []).reduce((sum, row) => {
        const facility = getField(row, [
            "Health Facility", "Facility", "HealthFacility"
        ]);

        return sum +
            (!startsWithExcel(facility, prefix)
                ? getCompleted(row)
                : 0);
    }, 0);
}

function findAuxSheetRows(possibleNames) {
    const sheets = APP.auxSheets || {};
    const sheetNames = Object.keys(sheets);

    for (const wanted of possibleNames) {
        const exact = sheetNames.find(
            name =>
                normalizeHeader(name) === normalizeHeader(wanted)
        );

        if (exact) return sheets[exact];
    }

    for (const wanted of possibleNames) {
        const match = sheetNames.find(
            name =>
                normalizeHeader(name).includes(normalizeHeader(wanted))
        );

        if (match) return sheets[match];
    }

    /*
     * If the uploaded raw files do not contain the auxiliary XLSM
     * sheets, return an empty set rather than inventing a value.
     */
    return [];
}

/* ==========================================================
   XLSM-COMPATIBLE CRITERIA HELPERS
   ========================================================== */

function equalsExcel(value, expected) {
    return String(value ?? "")
        .trim()
        .toUpperCase() ===
        String(expected ?? "")
            .trim()
            .toUpperCase();
}

function containsExcel(value, fragment) {
    return String(value ?? "")
        .toUpperCase()
        .includes(
            String(fragment ?? "").toUpperCase()
        );
}

function startsWithExcel(value, prefix) {
    return String(value ?? "")
        .trim()
        .toUpperCase()
        .startsWith(
            String(prefix ?? "").trim().toUpperCase()
        );
}

function startsWithSC(value) {
    return String(value ?? "")
        .trim()
        .toUpperCase()
        .startsWith("SC");
}

/* ==========================================================
   DISTRICT RESOLUTION FOR REFERRED DATA
   ========================================================== */

function resolveReferredDistrict(facilityUpper, districtField) {
    /*
     * EXACT "Daily Formula" workbook routing.
     * The workbook does NOT use one generic District-field mapping.
     * Several districts are carved out by Health Facility (column A),
     * then the remaining rows are matched using Ref_SC column B.
     *
     * This same resolver is used for the <5 analytics layer so that
     * its district totals match the main report.
     */
    const facility = String(facilityUpper ?? "").toUpperCase();
    const district = normalizeText(districtField);

    // Formula rows where the workbook uses Health Facility (A:A)
    if (facility.includes("BSNPR")) return "Bishnupur";
    if (facility.includes("BASIRHAT")) return "Basirhat";
    if (facility.includes("RAMPURHAT")) return "Rampurhat";
    if (facility.includes("NANDIGRAM")) return "Nandigram";
    if (facility.includes("DARJEELING GTA")) return "Darjeeling GTA";
    if (facility.includes("DARJEELING SMP")) return "Darjeeling SMP";
    if (facility.includes("DIAMOND HARBOUR")) return "Diamond Harbour";

    // Workbook's B:B based formulas / aliases.
    const exact = {
        "ALIPURDUAR": "Alipurduar",
        "BANKURA": "Bankura",
        "BIRBHUM": "Birbhum",
        "COOCHBEHAR": "COOCHBEHAR",
        "DINAJPUR DAKSHIN": "Dakshin Dinajpur",
        "DAKSHIN DINAJPUR": "Dakshin Dinajpur",
        "DINAJPUR UTTAR": "Uttar Dinajpur",
        "HOOGHLY": "Hoogly",
        "HOOGHLY": "Hoogly",
        "HOWRAH": "Howrah",
        "JALPAIGURI": "Jalpaiguri",
        "JHARGRAM": "Jhargram",
        "KALIMPONG": "Kalimpong",
        "MALDAH": "Malda",
        "MALDA": "Malda",
        "MURSHIDABAD": "Murshidabad",
        "NADIA": "NADIA",
        "PASCHIM BARDHAMAN": "Paschim Bardhaman",
        "PASCHIM BURDWAN": "Paschim Bardhaman",
        "MEDINIPUR WEST": "Paschim Medinipore",
        "PASCHIM MEDINIPORE": "Paschim Medinipore",
        "PURBA BARDHAMAN": "Purba Bardhaman",
        "PURBA BURDWAN": "Purba Bardhaman",
        "MEDINIPUR EAST": "Purba Medinipore",
        "PURBA MEDINIPORE": "Purba Medinipore",
        "PURULIA": "Purulia",
        "24 PARAGANAS NORTH": "North 24 Parganas",
        "24 PARAGANAS SOUTH": "South 24 Parganas",
        "NORTH 24 PARGANAS": "North 24 Parganas",
        "SOUTH 24 PARGANAS": "South 24 Parganas"
    };

    if (exact[district]) return exact[district];
    if (DISTRICT_ALIASES[district]) return DISTRICT_ALIASES[district];

    // Final facility fallback for source-file spelling variants.
    const facilityMatches = [
        ["DINAJPUR DAKSHIN", "Dakshin Dinajpur"],
        ["DAKSHIN DINAJPUR", "Dakshin Dinajpur"],
        ["DINAJPUR UTTAR", "Uttar Dinajpur"],
        ["UTTAR DINAJPUR", "Uttar Dinajpur"],
        ["PURBA BARDHAMAN", "Purba Bardhaman"],
        ["PURBA BURDWAN", "Purba Bardhaman"],
        ["PASCHIM BARDHAMAN", "Paschim Bardhaman"],
        ["PASCHIM BURDWAN", "Paschim Bardhaman"],
        ["PURBA MEDINIPORE", "Purba Medinipore"],
        ["MEDINIPUR EAST", "Purba Medinipore"],
        ["PASCHIM MEDINIPORE", "Paschim Medinipore"],
        ["MEDINIPUR WEST", "Paschim Medinipore"],
        ["24 PARAGANAS SOUTH", "South 24 Parganas"],
        ["24 PARAGANAS NORTH", "North 24 Parganas"]
    ];

    for (const [needle, mappedDistrict] of facilityMatches) {
        if (facility.includes(needle)) return mappedDistrict;
    }

    return null;
}
/* ==========================================================
   HUB MATCH
   ========================================================== */

function findDistrictByHubFacility(facilityUpper) {

    for (const [district, hub] of Object.entries(HUB_FACILITY_MAP)) {
        if (facilityUpper === hub) {
            return district;
        }
    }

    return null;
}

/* ==========================================================
   RANKING
   ========================================================== */

function assignExcelCompetitionRanks(
    items,
    valueKey,
    rankKey,
    direction = "desc"
) {
    /*
     * Excel RANK.EQ:
     *   direction "desc" => highest value = rank 1
     *   direction "asc"  => lowest value = rank 1
     *
     * Equal values receive the same rank. This is intentionally
     * different from the final Overall Rank presentation, which
     * is made unique after the Excel ordering has been reproduced.
     */
    const values = items.map(item => Number(item[valueKey]) || 0);

    items.forEach(item => {

        const value = Number(item[valueKey]) || 0;

        let rank = 1;

        values.forEach(other => {

            if (direction === "desc") {
                if (other > value) rank += 1;
            } else {
                if (other < value) rank += 1;
            }

        });

        item[rankKey] = rank;
    });
}

/* ==========================================================
   RENDER REPORT
   ========================================================== */

function renderReport(rows, referredRows = [], receivedRows = []) {

    const body = document.getElementById("reportBody");
    const footer = document.getElementById("reportFooter");

    body.innerHTML = "";
    footer.innerHTML = "";

    rows.forEach((row, index) => {

        const tr = document.createElement("tr");

        tr.className = getRankClass(row.overallRank);

        tr.innerHTML = `
            <td>${index + 1}</td>
            <td>${escapeHtml(row.zone)}</td>
            <td>${escapeHtml(row.district)}</td>

            <td>${formatInt(row.opAAM)}</td>
            <td>${formatInt(row.activeAAM)}</td>
            <td>${formatInt(row.activeAAM10)}</td>
            <td>${formatPercent(row.pctActiveAAM)}</td>
            <td class="rank-value">${row.rankActiveAAM}</td>

            <td>${formatInt(row.expectedDoctors)}</td>
            <td>${formatInt(row.activeDoctors)}</td>
            <td>${formatAvailability(row.pctAvailability)}</td>
            <td class="rank-value">${row.rankAvailability}</td>

            <td>${formatInt(row.spokeConsult)}</td>
            <td>${formatDecimal(row.consultPerAAM)}</td>
            <td class="rank-value">${row.rankSpoke}</td>

            <td>${formatInt(row.hubConsult)}</td>
            <td>${formatInt(row.consultPerDoctor)}</td>
            <td class="rank-value">${row.rankHub}</td>

            <td class="rank-value">${row.overallRank}</td>
        `;

        body.appendChild(tr);
    });

    renderStateFooter(rows);

    document.getElementById("reportDateText").textContent =
        formatLongDate(APP.reportDate);

    renderSummary();
    renderKPI(referredRows, receivedRows);
    renderFollowUpAnalytics(referredRows, receivedRows);
}

/* ==========================================================
   FOLLOW-UP ANALYTICS
   ========================================================== */

function toggleFollowUpAnalytics() {
    const section = document.getElementById("followUpAnalytics");
    if (!section) return;

    const opening = section.classList.contains("hidden");
    section.classList.toggle("hidden", !opening);

    const button = document.getElementById("followUpBtn");
    if (button) {
        button.classList.toggle("is-active", opening);
        button.textContent = opening
            ? "📊 Follow-up needed ✓"
            : "📊 Follow-up needed";
    }

    if (opening) {
        requestAnimationFrame(() => {
            section.scrollIntoView({ behavior: "smooth", block: "start" });
        });
    }
}

function hideFollowUpAnalytics() {
    const section = document.getElementById("followUpAnalytics");
    if (section) section.classList.add("hidden");

    const button = document.getElementById("followUpBtn");
    if (button) {
        button.classList.remove("is-active");
        button.textContent = "📊 Follow-up needed";
    }
}

function renderFollowUpAnalytics(referredRows = [], receivedRows = []) {
    const zeroData = (APP.rows || [])
        .map(row => ({
            district: row.district,
            value: Math.max(0, Number(row.opAAM || 0) - Number(row.activeAAM || 0))
        }))
        .sort((a, b) => b.value - a.value || a.district.localeCompare(b.district));

    const lowData = buildLowConsultationAAMData(referredRows);
    const superData = buildFacilitySuperSpecialityData(receivedRows);

    renderFollowUpBarChart("followupZeroChart", zeroData, {
        empty: "No district-wise zero-consultation gap found.",
        barClass: "bar-red"
    });

    renderFollowUpBarChart("followupLowChart", lowData, {
        empty: "No AAM with fewer than 5 consultations found.",
        barClass: "bar-amber"
    });

    renderFollowUpBarChart("followupSuperChart", superData, {
        empty: "No super speciality consultation data found.",
        barClass: "bar-green"
    });

    // Totals shown below all three analytics cards. These are derived
    // directly from the same datasets already used by the charts.
    setFollowUpTotal("followupZeroTotal", zeroData);
    setFollowUpTotal("followupLowTotal", lowData);
    setFollowUpTotal("followupSuperTotal", superData);
}

function setFollowUpTotal(id, data) {
    const el = document.getElementById(id);
    if (!el) return;
    const total = (Array.isArray(data) ? data : [])
        .reduce((sum, item) => sum + (Number(item.value) || 0), 0);
    el.textContent = formatInt(total);
}

function buildLowConsultationAAMData(referredRows) {
    /*
     * EXACT DAILY FORMULA <5 LAYER:
     * 1. Only Referred Summary rows whose Health Facility (B:B in the
     *    source report / Ref_SC) starts with "SC".
     * 2. Use the Completed consultation value for that SC row.
     * 3. Count only 1-4 consultations; zero is excluded.
     * 4. District assignment follows the Daily Formula sheet's
     *    district-specific COUNTIF/SUMIF carve-outs:
     *       Basirhat, Nandigram, Rampurhat, Bishnupur, Diamond Harbour,
     *       Darjeeling GTA/SMP are separated by Health Facility first;
     *       the remaining districts use the Ref_SC District field.
     */
    const counts = new Map();

    (Array.isArray(referredRows) ? referredRows : []).forEach(row => {
        const facilityRaw = getField(row, [
            "Health Facility", "Facility", "HealthFacility"
        ]);
        const facility = String(facilityRaw ?? "").trim();

        if (!startsWithSC(facility)) return;

        const districtField = getField(row, [
            "District", "District Name"
        ]);
        const resolvedDistrict = resolveReferredDistrict(
            String(facility).toUpperCase(),
            districtField
        );

        if (!resolvedDistrict) return;

        const completed = Number(getCompleted(row)) || 0;

        // EXACT <5 layer: 1, 2, 3 or 4. Never count zero.
        if (completed < 1 || completed >= 5) return;

        const key = normalizeDistrictKey(resolvedDistrict);
        const current = counts.get(key);

        if (current) {
            current.value += 1;
        } else {
            counts.set(key, {
                district: resolvedDistrict,
                value: 1
            });
        }
    });

    // Always return the same 28 district slots as the main report,
    // so a district with zero qualifying records still appears as 0.
    const orderedDistricts = DISTRICTS.map(item => item.district);

    return orderedDistricts
        .map(district => ({
            district,
            value: counts.get(normalizeDistrictKey(district))?.value || 0
        }))
        .sort((a, b) =>
            b.value - a.value ||
            a.district.localeCompare(b.district)
        );
}

function buildFacilitySuperSpecialityData(receivedRows) {
    const totals = new Map();

    (Array.isArray(receivedRows) ? receivedRows : []).forEach(row => {
        const district = normalizeText(getField(row, [
            "District", "District Name"
        ]));
        const facilityRaw = getField(row, [
            "Health Facility", "Facility", "HealthFacility"
        ]);
        const facility = normalizeText(facilityRaw);

        if (district !== "KOLKATA") return;
        if (facility === "HUB CENTRAL POOL") return;
        if (facility === "HUB STATE TELEMEDICINE CENTER") return;
        if (facility === "STATE TELEMEDICINE CENTER") return;
        if (facility === "HUB UPHC KOLKATA") return;

        const completed = getCompleted(row);
        const label = String(facilityRaw ?? "").trim() || "Unknown Facility";
        const key = normalizeText(label);
        const existing = totals.get(key);
        if (existing) existing.value += completed;
        else totals.set(key, { facility: label, value: completed });
    });

    return [...totals.values()]
        .sort((a, b) => b.value - a.value || a.facility.localeCompare(b.facility));
}

function renderFollowUpBarChart(id, data, options = {}) {
    const container = document.getElementById(id);
    if (!container) return;

    const list = Array.isArray(data) ? data : [];
    const max = Math.max(...list.map(item => Number(item.value) || 0), 1);

    if (!list.length) {
        container.innerHTML = `<div class="followup-empty">${escapeHtml(options.empty || "No data available")}</div>`;
        return;
    }

    container.innerHTML = list.map(item => {
        const value = Number(item.value) || 0;
        const width = Math.max(2, (value / max) * 100);
        return `
            <div class="followup-bar-row" title="${escapeHtml(item.facility || item.district)}: ${formatInt(value)}">
                <span class="followup-bar-label">${escapeHtml(item.facility || item.district)}</span>
                <div class="followup-bar-track">
                    <div class="followup-bar-fill ${options.barClass || "bar-red"}" style="width:${width}%"></div>
                </div>
                <strong class="followup-bar-value">${formatInt(value)}</strong>
            </div>
        `;
    }).join("");
}

/* ==========================================================
   KPI / INFO
   ========================================================== */

function renderKPI(referredRows = [], receivedRows = []) {
    const rows = APP.rows || [];

    const set = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };

    if (!rows.length) {
        set("kpiBestZone", "--");
        set("kpiBestSpoke", "--");
        set("kpiBestHub", "--");
        set("kpiBestActiveSpoke", "--");
        set("kpiBestDoctor", "--");
        set("kpiWorstZone", "--");
        set("kpiBestSpokeValue", "Highest spoke consultation");
        set("kpiBestHubValue", "Highest HUB consultation");
        set("kpiBestActiveSpokeValue", "Highest active AAM percentage");
        set("kpiBestDoctorValue", "Highest doctor availability");
        set("kpiWorstZoneValue", "Worst overall zone ranking");
        renderTopPerformerList("kpiTopDoctors", []);
        renderTopPerformerList("kpiTopAAMs", []);
        set("kpiAamUnder10", "--");
        set("kpiSuperSpeciality", "--");
        set("kpiAamUphcSpoke", "--");
        set("kpiAamPhcSpoke", "--");
        set("kpiActiveDoctorsToday", "--");
        return;
    }

    /*
     * Zone performance is based strictly on the report's Overall Rank.
     * For each zone, calculate its average district Overall Rank.
     * Lower average rank = better zone performance.
     */
    const zoneBuckets = new Map();

    rows.forEach(row => {
        if (!zoneBuckets.has(row.zone)) {
            zoneBuckets.set(row.zone, []);
        }
        zoneBuckets.get(row.zone).push(row);
    });

    const zonePerformance = [...zoneBuckets.entries()]
        .map(([zone, zoneRows]) => ({
            zone,
            averageRank:
                zoneRows.reduce(
                    (sum, r) => sum + Number(r.overallRank || 0),
                    0
                ) / zoneRows.length
        }))
        .sort((a, b) =>
            a.averageRank - b.averageRank ||
            a.zone.localeCompare(b.zone)
        );

    const bestZone = zonePerformance[0];
    const worstZone = zonePerformance[zonePerformance.length - 1];

    const bestBy = (key) => [...rows].sort((a, b) => {
        const diff =
            (Number(b[key]) || 0) -
            (Number(a[key]) || 0);

        return diff || a.district.localeCompare(b.district);
    })[0];

    const bestSpoke = bestBy("spokeConsult");
    const bestHub = bestBy("hubConsult");
    const bestActiveSpoke = bestBy("pctActiveAAM");
    const bestDoctor = bestBy("pctAvailability");

    set(
        "kpiBestZone",
        bestZone ? `ZONE ${bestZone.zone}` : "--"
    );

    set(
        "kpiBestSpoke",
        bestSpoke ? bestSpoke.district : "--"
    );

    set(
        "kpiBestSpokeValue",
        bestSpoke
            ? `${formatInt(bestSpoke.spokeConsult)} consultations`
            : "Highest spoke consultation"
    );

    set(
        "kpiBestHub",
        bestHub ? bestHub.district : "--"
    );

    set(
        "kpiBestHubValue",
        bestHub
            ? `${formatInt(bestHub.hubConsult)} consultations`
            : "Highest HUB consultation"
    );

    set(
        "kpiBestActiveSpoke",
        bestActiveSpoke ? bestActiveSpoke.district : "--"
    );

    set(
        "kpiBestActiveSpokeValue",
        bestActiveSpoke
            ? `${formatPercent(bestActiveSpoke.pctActiveAAM)} active AAM`
            : "Highest active AAM percentage"
    );

    set(
        "kpiBestDoctor",
        bestDoctor ? bestDoctor.district : "--"
    );

    set(
        "kpiBestDoctorValue",
        bestDoctor
            ? `${formatAvailability(bestDoctor.pctAvailability)} doctor availability`
            : "Highest doctor availability"
    );

    set(
        "kpiWorstZone",
        worstZone ? `ZONE ${worstZone.zone}` : "--"
    );

    set(
        "kpiWorstZoneValue",
        worstZone
            ? `Average overall rank: ${Math.round(worstZone.averageRank)}`
            : "Worst overall zone ranking"
    );

    const topDoctors = aggregateTopPerformers(receivedRows, {
        facilityFilter: value => startsWithHub(value),
        fallbackToAllRows: true
    });

    const topAAMs = aggregateTopPerformers(referredRows, {
        facilityFilter: value => startsWithSC(value),
        fallbackToAllRows: false
    });

    renderTopPerformerList("kpiTopDoctors", topDoctors);
    renderTopPerformerList("kpiTopAAMs", topAAMs);

    /* AAMs < 10 consultations KPI: count only AAMs with
       1-9 completed consultations from Referred Summary where
       Health Facility (B:B) starts with "SC". Zero-consultation AAMs
       are intentionally excluded from this KPI. */
    const aamConsultationBuckets = new Map();
    (Array.isArray(referredRows) ? referredRows : []).forEach(row => {
        const facility = String(getField(row, [
            "Health Facility", "Facility", "HealthFacility"
        ]) ?? "").trim();
        if (!startsWithSC(facility)) return;

        const district = String(getField(row, [
            "District", "District Name"
        ]) ?? "").trim();
        const person = String(getField(row, [
            "User", "User Name", "AAM", "AAM Name", "Name", "Provider"
        ]) ?? "").trim();
        if (!district || !person) return;

        const key = `${normalizeDistrictKey(district)}||${normalizePerson(person) || normalizeText(person)}||${normalizeText(facility)}`;
        const completed = getCompleted(row);
        const existing = aamConsultationBuckets.get(key);
        if (existing) existing.consultations += completed;
        else aamConsultationBuckets.set(key, { consultations: completed });
    });

    const aamUnder10Count = Array.from(aamConsultationBuckets.values())
        .filter(item => item.consultations >= 1 && item.consultations < 10)
        .length;

    set("kpiAamUnder10", formatInt(aamUnder10Count));

    /* Super Speciality KPI: single total count from Received Summary.
       District = KOLKATA; column B / Health Facility is used for exclusions.
       Excludes HUB CENTRAL POOL, HUB STATE TELEMEDICINE CENTER and
       HUB UPHC KOLKATA. */
    let superSpecialityTotal = 0;
    receivedRows.forEach(row => {
        const district = normalizeText(getField(row, [
            "District", "District Name"
        ]));
        const facility = normalizeText(getField(row, [
            "Health Facility", "Facility", "HealthFacility"
        ]));

        if (district !== "KOLKATA") return;
        if (facility === "HUB CENTRAL POOL") return;
        if (facility === "HUB STATE TELEMEDICINE CENTER") return;
        if (facility === "STATE TELEMEDICINE CENTER") return;
        if (facility === "HUB UPHC KOLKATA") return;

        superSpecialityTotal += getCompleted(row);
    });

    set("kpiSuperSpeciality", formatInt(superSpecialityTotal));

    /* AAM-UPHCs / AAM-PHCs spoke consultations: total Completed
       consultations from Referred Summary where Health Facility (B:B)
       starts with the requested prefix. */
    let aamUphcSpokeTotal = 0;
    let aamPhcSpokeTotal = 0;

    (Array.isArray(referredRows) ? referredRows : []).forEach(row => {
        const facility = String(getField(row, [
            "Health Facility", "Facility", "HealthFacility"
        ]) ?? "").trim();
        const facilityUpper = normalizeText(facility);
        const completed = getCompleted(row);

        if (facilityUpper.startsWith("UPHC")) {
            aamUphcSpokeTotal += completed;
        }
        if (facilityUpper.startsWith("PHC")) {
            aamPhcSpokeTotal += completed;
        }
    });

    set("kpiAamUphcSpoke", formatInt(aamUphcSpokeTotal));
    set("kpiAamPhcSpoke", formatInt(aamPhcSpokeTotal));

    /* Active Doctors Today: count the populated cells in Received Summary
       column D (User), exactly as a D:D row-count KPI. Do NOT de-duplicate
       names: repeated consultation rows are intentionally counted. */
    let activeDoctorsToday = 0;
    (Array.isArray(receivedRows) ? receivedRows : []).forEach(row => {
        const user = String(getField(row, [
            "User", "User Name", "Doctor", "Doctor Name", "Provider", "Name"
        ]) ?? "").trim();
        if (user) activeDoctorsToday += 1;
    });
    set("kpiActiveDoctorsToday", formatInt(activeDoctorsToday));

}

function aggregateTopPerformers(rows, options = {}) {
    const sourceRows = Array.isArray(rows) ? rows : [];
    const facilityFilter = options.facilityFilter || (() => true);
    const fallbackToAllRows = Boolean(options.fallbackToAllRows);

    const collect = list => {
        const buckets = new Map();

        list.forEach(row => {
            const facility = String(getField(row, [
                "Health Facility", "Facility", "HealthFacility"
            ]) ?? "").trim();

            if (!facilityFilter(facility)) return;

            const person = getField(row, [
                "User", "User Name", "Doctor", "Doctor Name",
                "Provider", "Name", "AAM", "AAM Name"
            ]);

            const displayName = String(person ?? "").trim();
            const completed = getCompleted(row);

            if (!displayName || completed <= 0) return;

            /* Keep the performer tied to the Health Facility from the
               source row (column B in the Received Summary layout). */
            const personKey = normalizePerson(displayName) || normalizeText(displayName);
            const facilityKey = normalizeText(facility);
            const key = `${personKey}||${facilityKey}`;
            const existing = buckets.get(key);

            if (existing) {
                existing.consultations += completed;
            } else {
                buckets.set(key, {
                    name: displayName,
                    facility,
                    consultations: completed
                });
            }
        });

        return [...buckets.values()]
            .sort((a, b) =>
                b.consultations - a.consultations ||
                a.name.localeCompare(b.name)
            )
            .slice(0, 3);
    };

    let result = collect(sourceRows);

    if (!result.length && fallbackToAllRows) {
        result = aggregateTopPerformersAllRows(sourceRows);
    }

    return result;
}

function aggregateTopPerformersAllRows(rows) {
    const buckets = new Map();

    (Array.isArray(rows) ? rows : []).forEach(row => {
        const facility = String(getField(row, [
            "Health Facility", "Facility", "HealthFacility"
        ]) ?? "").trim();

        const person = getField(row, [
            "User", "User Name", "Doctor", "Doctor Name",
            "Provider", "Name", "AAM", "AAM Name"
        ]);
        const displayName = String(person ?? "").trim();
        const completed = getCompleted(row);

        if (!displayName || completed <= 0) return;

        const personKey = normalizePerson(displayName) || normalizeText(displayName);
        const facilityKey = normalizeText(facility);
        const key = `${personKey}||${facilityKey}`;
        const existing = buckets.get(key);

        if (existing) existing.consultations += completed;
        else buckets.set(key, {
            name: displayName,
            facility,
            consultations: completed
        });
    });

    return [...buckets.values()]
        .sort((a, b) => b.consultations - a.consultations || a.name.localeCompare(b.name))
        .slice(0, 3);
}

function renderTopPerformerList(id, performers) {
    const el = document.getElementById(id);
    if (!el) return;

    if (!performers.length) {
        el.innerHTML = '<span class="kpi-empty">No completed consultations found</span>';
        return;
    }

    el.innerHTML = performers.map((item, index) => `
        <div class="kpi-top-item">
            <span class="kpi-top-rank">${index + 1}</span>
            <div class="kpi-top-person">
                <span class="kpi-top-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
                <span class="kpi-top-facility" title="${escapeHtml(item.facility || "")}">${escapeHtml(item.facility || "Facility not available")}</span>
            </div>
            <strong>${formatInt(item.consultations)}</strong>
        </div>
    `).join("");
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function startsWithHub(value) {
    return normalizeText(value).startsWith("HUB");
}

/* ==========================================================
   LIVE DATE & TIME
   ========================================================== */

function startLiveClock() {
    const update = () => {
        const now = new Date();
        const dateEl = document.getElementById("liveDate");
        const timeEl = document.getElementById("liveTime");

        if (dateEl) {
            dateEl.textContent = now.toLocaleDateString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                timeZone: "Asia/Kolkata"
            });
        }

        if (timeEl) {
            timeEl.textContent = now.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
                timeZone: "Asia/Kolkata"
            });
        }
    };

    update();
    setInterval(update, 1000);
}

/* ==========================================================
   STATE TOTAL FOOTER
   ========================================================== */

function renderStateFooter(rows) {

    const footer = document.getElementById("reportFooter");

    const totalOp = rows.reduce((s, r) => s + r.opAAM, 0);
    const totalActive = rows.reduce((s, r) => s + r.activeAAM, 0);
    const totalActive10 = rows.reduce((s, r) => s + r.activeAAM10, 0);
    const totalDoctors = rows.reduce((s, r) => s + r.activeDoctors, 0);

    const totalExpected =
        rows.reduce((s, r) => s + r.expectedDoctors, 0);

    const totalSpoke =
        rows.reduce((s, r) => s + r.spokeConsult, 0);

    const totalHub =
        rows.reduce((s, r) => s + r.hubConsult, 0);

    const activePct =
        totalOp > 0
            ? (totalActive10 / totalOp) * 100
            : 0;

    const doctorPct =
        totalExpected > 0
            ? (totalDoctors / totalExpected) * 100
            : 0;

    const spokePerAAM =
        totalOp > 0
            ? totalSpoke / totalOp
            : 0;

    const hubPerDoctor =
        totalDoctors > 0
            ? totalHub / totalDoctors
            : 0;

    footer.innerHTML = `
        <tr class="state-total-row">
            <td colspan="3"><strong>WEST BENGAL : AAM-HWC</strong></td>

            <td>${formatInt(totalOp)}</td>
            <td>${formatInt(totalActive)}</td>
            <td>${formatInt(totalActive10)}</td>
            <td>${formatPercent(activePct)}</td>
            <td>#N/A</td>

            <td>${formatInt(totalExpected)}</td>
            <td>${formatInt(totalDoctors)}</td>
            <td>${formatPercent(doctorPct)}</td>
            <td>#N/A</td>

            <td>${formatInt(totalSpoke)}</td>
            <td>${formatInt(spokePerAAM)}</td>
            <td>#N/A</td>

            <td>${formatInt(totalHub)}</td>
            <td>${formatInt(hubPerDoctor)}</td>
            <td>#N/A</td>

            <td></td>
        </tr>
    `;

    const row = footer.querySelector(".state-total-row");

    row.style.background = "#d8e1eb";
    row.style.fontWeight = "800";
}

/* ==========================================================
   SUMMARY
   ========================================================== */

function renderSummary() {

    const s = APP.summary || {};

    document.getElementById("summarySpoke").textContent =
        formatInt(s.totalReferred || 0);

    document.getElementById("summaryHub").textContent =
        formatInt(s.totalReceived || 0);

    document.getElementById("mchTotal").textContent =
        formatInt(s.mch || 0);

    document.getElementById("uphcTotal").textContent =
        formatInt(s.uphc || 0);

    document.getElementById("otherSpokeTotal").textContent =
        formatInt(s.otherSpoke || 0);
}

/* ==========================================================
   RANK COLOUR
   Exact representation requested:
   1–10 green
   11–21 peach
   22–28 red
   ========================================================== */

function getRankClass(rank) {

    if (rank >= 1 && rank <= 10) {
        return "rank-green";
    }

    if (rank >= 11 && rank <= 21) {
        return "rank-orange";
    }

    if (rank >= 22) {
        return "rank-red";
    }

    return "";
}

/* ==========================================================
   FIELD / NUMBER HELPERS
   ========================================================== */

function getField(row, possibleNames) {

    const keys = Object.keys(row);

    for (const wanted of possibleNames) {

        const exact = keys.find(
            key => normalizeHeader(key) === normalizeHeader(wanted)
        );

        if (exact !== undefined) {
            return row[exact];
        }
    }

    /* Flexible fallback. */
    for (const wanted of possibleNames) {

        const match = keys.find(
            key =>
                normalizeHeader(key).includes(normalizeHeader(wanted))
        );

        if (match !== undefined) {
            return row[match];
        }
    }

    return "";
}

function getCompleted(row) {

    const value = getField(row, [
        "Completed",
        "completed",
        "Completed Count"
    ]);

    const number = parseFloat(
        String(value ?? "")
            .replace(/,/g, "")
            .trim()
    );

    return Number.isFinite(number) ? number : 0;
}

function normalizeHeader(value) {

    return String(value ?? "")
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeText(value) {

    return String(value ?? "")
        .toUpperCase()
        .replace(/\u00A0/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeDistrictKey(value) {

    return normalizeText(value)
        .replace(/[^A-Z0-9]/g, "");
}

function normalizePerson(value) {

    return normalizeText(value)
        .replace(/\b(DR|DOCTOR|MR|MRS|MS|CHO|MO|MOIC|GDMO|MBBS|MD|DNB)\b/g, "")
        .replace(/[^A-Z0-9 ]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}

/* ==========================================================
   FORMAT
   ========================================================== */

function formatInt(value) {

    const number = Number(value) || 0;

    return Math.round(number).toLocaleString("en-IN");
}

function formatDecimal(value) {

    const number = Number(value) || 0;

    return number.toLocaleString("en-IN", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 1
    });
}

function formatAvailability(value) {

    const number = Number(value) || 0;

    // pctAvailability is already stored as a percentage (e.g. 128.57),
    // so never divide/multiply or cap it here.
    return `${number.toFixed(0)}%`;
}

function formatPercent(value) {

    const number = Number(value) || 0;

    /* District percentages are stored as Excel ratios (0..1).
       Total-row percentages are already expressed as 0..100. */
    const display = Math.abs(number) <= 1 ? number * 100 : number;

    return `${display.toFixed(0)}%`;
}

/* ==========================================================
   STATUS / LOADING
   ========================================================== */

function setStatus(message, type = "info") {

    const el = document.getElementById("status");

    el.className = `status ${type}`;
    el.innerHTML = message;
}

function setLoading(active, message = "Processing...") {

    const loading = document.getElementById("loading");

    document.getElementById("loadingText").textContent = message;

    loading.classList.toggle("hidden", !active);
}

/* ==========================================================
   SAFE BUTTON STATE
   ========================================================== */

function setButtonDisabled(id, disabled) {
    const el = document.getElementById(id);
    if (el) el.disabled = Boolean(disabled);
}

/* ==========================================================
   RESET
   ========================================================== */

function resetApplication() {

    document.getElementById("file1").value = "";
    document.getElementById("file2").value = "";

    document.getElementById("file1Name").textContent =
        "No file selected";

    document.getElementById("file2Name").textContent =
        "No file selected";

    document.getElementById("reportSection").classList.add("hidden");

    document.getElementById("reportBody").innerHTML = "";
    document.getElementById("reportFooter").innerHTML = "";

    [
        "pdfBtn",
        "excelBtn",
        "pngBtn"
    ].forEach(id => setButtonDisabled(id, true));
    setButtonDisabled("followUpBtn", true);
    hideFollowUpAnalytics();

    APP.rows = [];
    APP.generated = false;
    APP.summary = null;
    APP.auxSheets = {};

    const resetKpi = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    };
    resetKpi("kpiBestZone", "--");
    resetKpi("kpiBestSpoke", "--");
    resetKpi("kpiBestHub", "--");
    resetKpi("kpiBestActiveSpoke", "--");
    resetKpi("kpiBestDoctor", "--");
    resetKpi("kpiWorstZone", "--");
    resetKpi("kpiAamUnder10", "--");
    resetKpi("kpiActiveDoctorsToday", "--");
    const superReset = document.getElementById("kpiSuperSpeciality");
    if (superReset) superReset.innerHTML = '<span class="kpi-empty">Generate report to view</span>';
    const topDoctorReset = document.getElementById("kpiTopDoctors");
    const topAamReset = document.getElementById("kpiTopAAMs");
    if (topDoctorReset) topDoctorReset.innerHTML = '<span class="kpi-empty">Generate report to view</span>';
    if (topAamReset) topAamReset.innerHTML = '<span class="kpi-empty">Generate report to view</span>';
    resetKpi("kpiBestSpokeValue", "Highest spoke consultation");
    resetKpi("kpiBestHubValue", "Highest HUB consultation");
    resetKpi("kpiBestActiveSpokeValue", "Highest active AAM percentage");
    resetKpi("kpiBestDoctorValue", "Highest doctor availability");
    resetKpi("kpiWorstZoneValue", "Worst overall zone ranking");

    setStatus(
        "Select both raw Excel files and click <strong>Generate Daily Report</strong>.",
        "info"
    );

    setLoading(false);

    setDefaultDate();
}

/* ==========================================================
   EXCEL EXPORT — REPORT-STYLE COLOUR CODING
   ========================================================== */

function exportExcel() {

    if (!APP.generated) return;

    try {
        setLoading(true, "Preparing formatted Excel workbook...");

        /*
         * Excel export intentionally mirrors the on-screen report:
         *  - 3-tier grouped headings
         *  - complete heading text (no abbreviated column names)
         *  - colour-coded district rows
         *  - West Bengal total row
         *  - consultation summary/footer
         *  - explanatory notes at the bottom
         */
        const reportTitle = `TELEMEDICINE   ::   DAILY   AAM-HWCs   PERFORMANCE      REPORT FOR ${formatLongDate(APP.reportDate)}`;

        const data = [
            [reportTitle, "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""],
            [
                "Sl. No.", "ZONE", "DISTRICTS",
                "ACTIVE SPOKES", "", "", "", "",
                "DOCTORS AVAILABILITY", "", "", "",
                "PERFORMANCE ANALYSIS", "", "", "", "", "",
                "Overall Rank"
            ],
            [
                "", "", "",
                "No of Operational AAMs [A]",
                "**No of active AAMs [B]",
                "**No of active AAMs [Z] [>=10]",
                "% Active AAMs [Z/A*100]",
                "Rank",
                "Expected No of Doctors (1:5) [C]",
                "Active Doctors [D]",
                "%age Availability [D/C*100]",
                "Rank",
                "Spoke Performance", "", "",
                "Hub Performance", "", "",
                ""
            ],
            [
                "", "", "",
                "", "", "", "", "",
                "", "", "", "",
                "AAM Total Consultations [E]",
                "No of consultations per operational AAM",
                "Rank",
                "*** HUB Total Consultations [F]",
                "No of consultations per Active Doctor [F/D]",
                "Rank",
                ""
            ]
        ];

        APP.rows.forEach((r, i) => {
            data.push([
                i + 1,
                r.zone,
                r.district,
                r.opAAM,
                r.activeAAM,
                r.activeAAM10,
                Number((r.pctActiveAAM / 100).toFixed(6)),
                r.rankActiveAAM,
                r.expectedDoctors,
                r.activeDoctors,
                Number((r.pctAvailability / 100).toFixed(6)),
                r.rankAvailability,
                r.spokeConsult,
                Number(r.consultPerAAM.toFixed(2)),
                r.rankSpoke,
                r.hubConsult,
                Math.round(r.consultPerDoctor),
                r.rankHub,
                r.overallRank
            ]);
        });

        const rows = APP.rows;
        const totalOp = rows.reduce((s, r) => s + r.opAAM, 0);
        const totalActive = rows.reduce((s, r) => s + r.activeAAM, 0);
        const totalActive10 = rows.reduce((s, r) => s + r.activeAAM10, 0);
        const totalDoctors = rows.reduce((s, r) => s + r.activeDoctors, 0);
        const totalExpected = rows.reduce((s, r) => s + r.expectedDoctors, 0);
        const totalSpoke = rows.reduce((s, r) => s + r.spokeConsult, 0);
        const totalHub = rows.reduce((s, r) => s + r.hubConsult, 0);

        const activePct = totalOp ? (totalActive10 / totalOp) * 100 : 0;
        const doctorPct = totalExpected ? (totalDoctors / totalExpected) * 100 : 0;
        const spokePerAAM = totalOp ? totalSpoke / totalOp : 0;
        const hubPerDoctor = totalDoctors ? totalHub / totalDoctors : 0;

        /* West Bengal total row. */
        data.push([
            "", "", "WEST BENGAL : AAM-HWC",
            totalOp, totalActive, totalActive10,
            Number((activePct / 100).toFixed(6)), "#N/A",
            totalExpected, totalDoctors,
            Number((doctorPct / 100).toFixed(6)), "#N/A",
            totalSpoke, Number(spokePerAAM.toFixed(2)), "#N/A",
            totalHub, Math.round(hubPerDoctor), "#N/A", ""
        ]);

        const totalRowIndex = data.length - 1;
        const summary = APP.summary || {};
        const totalReferred = Number(summary.totalReferred || 0);
        const totalReceived = Number(summary.totalReceived || 0);
        const mch = Number(summary.mch || 0);
        const uphc = Number(summary.uphc || 0);
        const otherSpoke = Number(summary.otherSpoke || 0);

        /*
         * Footer rows mirror the portal footer shown beneath the table.
         * The first row is the overall consultation summary, followed by
         * the three explanatory calculation blocks and the Active AAM note.
         */
        const summaryRowIndex = data.length;
        data.push([
            "Total Consultation : West Bengal", "", "", "", "", "", "", "", "", "", "", "", "", "SPOKE CONSULTATION", totalReferred, "HUB CONSULTATION", totalReceived, "", ""
        ]);

        const notesRowIndex = data.length;
        data.push([
            "NOTE",
            "* Hub Performance: Number of consultation done by MCH, State Telemedicine Center and Super Specialist Center",
            "", "", "", "", mch,
            "Number of consultation done by AAM–UPHC HUB", "", "", "", uphc,
            "## Consultation from Spoke other than AAMs", "", "", "", "", "", otherSpoke
        ]);

        const doctorNoteRowIndex = data.length;
        data.push([
            "***Active Doctor : Doctor's completed at least one consultation",
            "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
        ]);

        const activeAamNoteRowIndex = data.length;
        data.push([
            "** Active AAM : AAMs completed at least ten consultation Vide Memo No. HFW/NCD/462/2021 dated 8th October 2021",
            "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""
        ]);

        const ws = XLSX.utils.aoa_to_sheet(data);

        /* Grouped/merged headings exactly like the portal. */
        ws["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 18 } },
            { s: { r: 1, c: 0 }, e: { r: 3, c: 0 } },
            { s: { r: 1, c: 1 }, e: { r: 3, c: 1 } },
            { s: { r: 1, c: 2 }, e: { r: 3, c: 2 } },
            { s: { r: 1, c: 3 }, e: { r: 1, c: 7 } },
            { s: { r: 1, c: 8 }, e: { r: 1, c: 11 } },
            { s: { r: 1, c: 12 }, e: { r: 1, c: 17 } },
            { s: { r: 1, c: 18 }, e: { r: 3, c: 18 } },
            { s: { r: 2, c: 3 }, e: { r: 3, c: 3 } },
            { s: { r: 2, c: 4 }, e: { r: 3, c: 4 } },
            { s: { r: 2, c: 5 }, e: { r: 3, c: 5 } },
            { s: { r: 2, c: 6 }, e: { r: 3, c: 6 } },
            { s: { r: 2, c: 7 }, e: { r: 3, c: 7 } },
            { s: { r: 2, c: 8 }, e: { r: 3, c: 8 } },
            { s: { r: 2, c: 9 }, e: { r: 3, c: 9 } },
            { s: { r: 2, c: 10 }, e: { r: 3, c: 10 } },
            { s: { r: 2, c: 11 }, e: { r: 3, c: 11 } },
            { s: { r: 2, c: 12 }, e: { r: 2, c: 14 } },
            { s: { r: 2, c: 15 }, e: { r: 2, c: 17 } },
        ];

        /* Footer merges. */
        ws["!merges"].push(
            { s: { r: summaryRowIndex, c: 0 }, e: { r: summaryRowIndex, c: 12 } },
            { s: { r: summaryRowIndex, c: 15 }, e: { r: summaryRowIndex, c: 15 } },
            { s: { r: summaryRowIndex, c: 17 }, e: { r: summaryRowIndex, c: 18 } },
            { s: { r: notesRowIndex, c: 1 }, e: { r: notesRowIndex, c: 5 } },
            { s: { r: notesRowIndex, c: 7 }, e: { r: notesRowIndex, c: 10 } },
            { s: { r: notesRowIndex, c: 12 }, e: { r: notesRowIndex, c: 17 } },
            { s: { r: doctorNoteRowIndex, c: 0 }, e: { r: doctorNoteRowIndex, c: 18 } },
            { s: { r: activeAamNoteRowIndex, c: 0 }, e: { r: activeAamNoteRowIndex, c: 18 } }
        );

        ws["!cols"] = [
            { wch: 8 }, { wch: 8 }, { wch: 24 },
            { wch: 15 }, { wch: 15 }, { wch: 16 }, { wch: 15 }, { wch: 8 },
            { wch: 16 }, { wch: 13 }, { wch: 16 }, { wch: 8 },
            { wch: 18 }, { wch: 19 }, { wch: 8 },
            { wch: 18 }, { wch: 21 }, { wch: 8 }, { wch: 12 }
        ];

        ws["!freeze"] = { xSplit: 3, ySplit: 4 };
        ws["!autofilter"] = { ref: `A4:S${totalRowIndex}` };

        const border = {
            top: { style: "thin", color: { rgb: "73808C" } },
            bottom: { style: "thin", color: { rgb: "73808C" } },
            left: { style: "thin", color: { rgb: "73808C" } },
            right: { style: "thin", color: { rgb: "73808C" } }
        };

        const thinWhiteBorder = {
            top: { style: "thin", color: { rgb: "FFFFFF" } },
            bottom: { style: "thin", color: { rgb: "FFFFFF" } },
            left: { style: "thin", color: { rgb: "FFFFFF" } },
            right: { style: "thin", color: { rgb: "FFFFFF" } }
        };

        const fills = {
            yellow: { patternType: "solid", fgColor: { rgb: "FFC233" } },
            doctor: { patternType: "solid", fgColor: { rgb: "C5D0DB" } },
            green: { patternType: "solid", fgColor: { rgb: "00A651" } },
            overall: { patternType: "solid", fgColor: { rgb: "B8C5D5" } },
            total: { patternType: "solid", fgColor: { rgb: "D8E1EB" } },
            rankGreen: { patternType: "solid", fgColor: { rgb: "C5DDB3" } },
            rankPeach: { patternType: "solid", fgColor: { rgb: "F9E4D4" } },
            rankRed: { patternType: "solid", fgColor: { rgb: "FF4B50" } },
            footerYellow: { patternType: "solid", fgColor: { rgb: "FFFF2E" } },
            footerBlue: { patternType: "solid", fgColor: { rgb: "B8C5D5" } }
        };

        const baseFont = { name: "Arial", sz: 10, color: { rgb: "111111" } };
        const headerFont = { name: "Arial", sz: 10, bold: true, color: { rgb: "111111" } };
        const groupFont = { name: "Arial", sz: 12, bold: true, color: { rgb: "111111" } };

        /* Main Excel export title row. */
        for (let c = 0; c < 19; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r: 0, c })];
            if (!cell) continue;
            cell.s = {
                font: { name: "Arial", sz: 16, bold: true, color: { rgb: "102A72" } },
                fill: { patternType: "solid", fgColor: { rgb: "FFFFFF" } },
                border: {
                    bottom: { style: "medium", color: { rgb: "102A72" } }
                },
                alignment: { horizontal: "center", vertical: "center", wrapText: false }
            };
        }

        /* Header row 1: main section groups. */
        for (let c = 0; c < 19; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r: 1, c })];
            if (!cell) continue;

            let fill = fills.overall;
            if (c >= 3 && c <= 7) fill = fills.yellow;
            else if (c >= 8 && c <= 11) fill = fills.doctor;
            else if (c >= 12 && c <= 17) fill = fills.green;

            cell.s = {
                font: groupFont,
                fill,
                border: thinWhiteBorder,
                alignment: { horizontal: "center", vertical: "center", wrapText: true }
            };
        }

        /* Header rows 2–3. */
        for (let r = 2; r <= 3; r++) {
            for (let c = 0; c < 19; c++) {
                const cell = ws[XLSX.utils.encode_cell({ r, c })];
                if (!cell) continue;

                let fill = fills.overall;
                if (c >= 3 && c <= 7) fill = fills.yellow;
                else if (c >= 8 && c <= 11) fill = fills.doctor;
                else if (c >= 12 && c <= 17) fill = fills.green;

                cell.s = {
                    font: headerFont,
                    fill,
                    border: thinWhiteBorder,
                    alignment: { horizontal: "center", vertical: "center", wrapText: true }
                };
            }
        }

        /* Data rows. */
        for (let r = 4; r <= totalRowIndex; r++) {
            const isTotal = r === totalRowIndex;
            const overallRank = APP.rows[r - 4]?.overallRank;

            for (let c = 0; c < 19; c++) {
                const cell = ws[XLSX.utils.encode_cell({ r, c })];
                if (!cell) continue;

                let fill = fills.total;
                let fontColor = "111111";

                if (!isTotal) {
                    if (overallRank >= 1 && overallRank <= 10) fill = fills.rankGreen;
                    else if (overallRank >= 11 && overallRank <= 21) fill = fills.rankPeach;
                    else fill = fills.rankRed;

                    /* Red-ranked row content remains white, as in the portal. */
                    if (overallRank >= 22) fontColor = "FFFFFF";
                }

                cell.s = {
                    font: {
                        ...baseFont,
                        bold: isTotal || c === 2 || [7, 11, 14, 17, 18].includes(c),
                        color: { rgb: fontColor }
                    },
                    fill,
                    border,
                    alignment: {
                        horizontal: c === 2 ? "left" : "center",
                        vertical: "center",
                        wrapText: true
                    }
                };

                /* Export percentage fields as true Excel percentages, not decimals. */
                if (c === 6 || c === 10) {
                    cell.z = "0%";
                    cell.s.numFmt = "0%";
                }
            }
        }

        /* Footer styling. */
        for (let c = 0; c < 19; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r: summaryRowIndex, c })];
            if (!cell) continue;
            cell.s = {
                font: { name: "Arial", sz: 11, bold: true, color: { rgb: "17233B" } },
                fill: fills.footerBlue,
                border,
                alignment: { horizontal: "center", vertical: "center", wrapText: true }
            };
        }

        for (let c = 0; c < 19; c++) {
            const cell = ws[XLSX.utils.encode_cell({ r: notesRowIndex, c })];
            if (!cell) continue;
            cell.s = {
                font: { name: "Arial", sz: 9, bold: c === 0 || [6, 11, 18].includes(c), color: { rgb: c === 0 ? "D00000" : "D00000" } },
                fill: fills.footerYellow,
                border,
                alignment: { horizontal: "center", vertical: "center", wrapText: true }
            };
        }

        for (const rowIndex of [doctorNoteRowIndex, activeAamNoteRowIndex]) {
            for (let c = 0; c < 19; c++) {
                const cell = ws[XLSX.utils.encode_cell({ r: rowIndex, c })];
                if (!cell) continue;
                cell.s = {
                    font: { name: "Arial", sz: 10, bold: true, color: { rgb: "D00000" } },
                    fill: fills.footerYellow,
                    border,
                    alignment: { horizontal: "center", vertical: "center", wrapText: true }
                };
            }
        }

        /* Row heights: enough space for every complete heading/footer line. */
        ws["!rows"] = Array.from({ length: data.length }, (_, i) => {
            if (i === 0) return { hpt: 34 };
            if (i === 1) return { hpt: 28 };
            if (i === 2) return { hpt: 42 };
            if (i === 3) return { hpt: 54 };
            if (i === totalRowIndex) return { hpt: 28 };
            if (i === summaryRowIndex) return { hpt: 30 };
            if (i === notesRowIndex) return { hpt: 54 };
            if (i === doctorNoteRowIndex) return { hpt: 28 };
            if (i === activeAamNoteRowIndex) return { hpt: 30 };
            return { hpt: 23 };
        });

        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Daily Performance Report");

        const date = compactDate(APP.reportDate);
        XLSX.writeFile(
            wb,
            `${date}_West_Bengal_AAM_HWC_Performance_Report.xlsx`
        );

        setStatus("Complete formatted Excel report with headings and footer exported successfully.", "success");

    } catch (error) {
        console.error(error);
        setStatus(`Excel export failed: ${error.message}`, "error");
    } finally {
        setLoading(false);
    }
}

/* ==========================================================
   PNG EXPORT
   ========================================================== */

async function buildExportCanvas() {
    const source = document.getElementById("reportPaper");
    if (!source) throw new Error("Report section not found.");

    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const clone = source.cloneNode(true);
    clone.classList.add("export-capture");
    clone.id = "reportPaperExport";

    const wrapper = document.createElement("div");
    wrapper.className = "export-capture";
    wrapper.style.position = "fixed";
    wrapper.style.left = "-100000px";
    wrapper.style.top = "0";
    wrapper.style.width = `${Math.max(source.scrollWidth, 1500)}px`;
    wrapper.style.maxWidth = "none";
    wrapper.style.background = "#fff";
    wrapper.style.overflow = "visible";
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    // Force the clone to expose every scrollable area and preserve the
    // dashboard report typography. The Follow-up section is intentionally
    // omitted from the normal report export unless it was opened by the user.
    clone.querySelectorAll(".table-scroll, .kpi-facility-list, .followup-bars").forEach(el => {
        el.style.overflow = "visible";
        el.style.maxHeight = "none";
        el.style.height = "auto";
    });

    clone.querySelectorAll(".report-paper, .kpi-strip, .kpi-card").forEach(el => {
        el.style.overflow = "visible";
    });

    // Give the export clone a deterministic width so html2canvas never
    // captures only the visible viewport portion of the report.
    clone.style.width = "100%";
    clone.style.maxWidth = "none";
    clone.style.transform = "none";

    await new Promise(resolve => requestAnimationFrame(resolve));

    const width = Math.ceil(clone.scrollWidth);
    const height = Math.ceil(clone.scrollHeight);

    const canvas = await html2canvas(clone, {
        scale: 3,
        useCORS: true,
        allowTaint: false,
        backgroundColor: "#ffffff",
        logging: false,
        imageTimeout: 20000,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
        scrollX: 0,
        scrollY: 0
    });

    wrapper.remove();
    return canvas;
}

/* ==========================================================
   PNG EXPORT
   ========================================================== */

async function exportPNG() {
    if (!APP.generated) return;

    try {
        setLoading(true, "Preparing complete high-resolution PNG report...");

        const canvas = await buildExportCanvas();
        const link = document.createElement("a");
        link.download = `${compactDate(APP.reportDate)}_West_Bengal_AAM_HWC_Performance_Report.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();

        setStatus("Complete high-resolution PNG exported with all KPIs and report rows visible.", "success");
    } catch (error) {
        console.error(error);
        setStatus(`PNG export failed: ${error.message}`, "error");
    } finally {
        setLoading(false);
    }
}

/* ==========================================================
   PDF EXPORT — COMPLETE REPORT / SINGLE A4 LANDSCAPE PAGE
   ========================================================== */

async function exportPDF() {
    if (!APP.generated) return;

    try {
        setLoading(true, "Preparing complete A4 landscape PDF report...");

        const canvas = await buildExportCanvas();
        const { jsPDF } = window.jspdf;

        const pdf = new jsPDF({
            orientation: "landscape",
            unit: "mm",
            format: "a4",
            compress: true,
            putOnlyUsedFonts: true
        });

        const pageWidth = 297;
        const pageHeight = 210;
        const margin = 2;
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - margin * 2;
        const ratio = canvas.width / canvas.height;

        let width = maxWidth;
        let height = width / ratio;
        if (height > maxHeight) {
            height = maxHeight;
            width = height * ratio;
        }

        const x = (pageWidth - width) / 2;
        const y = (pageHeight - height) / 2;
        const image = canvas.toDataURL("image/jpeg", 0.985);

        pdf.addImage(image, "JPEG", x, y, width, height, undefined, "FAST");
        pdf.save(`${compactDate(APP.reportDate)}_West_Bengal_AAM_HWC_Performance_Report.pdf`);

        setStatus("Complete report exported to one A4 landscape page with all KPIs and 28 districts visible.", "success");
    } catch (error) {
        console.error(error);
        setStatus(`PDF export failed: ${error.message}`, "error");
    } finally {
        setLoading(false);
    }
}

/* ==========================================================
   UTILITIES
   ========================================================== */

function compactDate(dateValue) {

    if (!dateValue) return "Report";

    return dateValue.replace(/-/g, "");
}

