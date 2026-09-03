// --- FILE: script.js --- //

/*
=========================================================
 ANALISIS-2D
 Statistical Analysis Engine
 Timezone: Asia/Jakarta
 Storage: dataAnalis2d
=========================================================
*/


"use strict";


// =========================================================
// KONFIGURASI
// =========================================================

const STORAGE_KEY = "dataAnalis2d";

const MAX_DATA = 365;

const RESULT_HOUR = 17;

const TIMEZONE = "Asia/Jakarta";

let chartFreq = null;


// =========================================================
// HELPER: AMBIL DATA LOCAL STORAGE
// =========================================================

function getData() {

    try {

        const raw = localStorage.getItem(STORAGE_KEY);

        if (!raw) {
            return [];
        }

        const data = JSON.parse(raw);

        if (!Array.isArray(data)) {
            return [];
        }

        return data;

    } catch (error) {

        console.error(
            "Gagal membaca LocalStorage:",
            error
        );

        return [];
    }
}


// =========================================================
// HELPER: SIMPAN DATA
// =========================================================

function saveData(data) {

    // Urutkan berdasarkan tanggal
    data.sort((a, b) =>
        a.tanggal.localeCompare(b.tanggal)
    );


    // Maksimal 365 data terakhir
    if (data.length > MAX_DATA) {

        data = data.slice(
            data.length - MAX_DATA
        );

    }


    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
    );


    updateDataCount();
}


// =========================================================
// HELPER: TANGGAL WIB
// =========================================================

function getJakartaDate() {

    const formatter = new Intl.DateTimeFormat(
        "en-CA",
        {
            timeZone: TIMEZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }
    );

    return formatter.format(new Date());
}


// =========================================================
// HELPER: JAM WIB
// =========================================================

function getJakartaTime() {

    const formatter = new Intl.DateTimeFormat(
        "en-GB",
        {
            timeZone: TIMEZONE,
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        }
    );

    return formatter.format(new Date());
}


// =========================================================
// HELPER: OBJEK WAKTU WIB
// =========================================================

function getJakartaDateTimeParts() {

    const formatter = new Intl.DateTimeFormat(
        "en-US",
        {
            timeZone: TIMEZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hourCycle: "h23"
        }
    );

    const parts = formatter.formatToParts(
        new Date()
    );

    const result = {};

    parts.forEach(part => {

        if (part.type !== "literal") {
            result[part.type] = Number(part.value);
        }

    });

    return result;
}


// =========================================================
// HELPER: FORMAT TANGGAL
// =========================================================

function formatTanggal(tanggal) {

    if (!tanggal) {
        return "-";
    }

    const date = new Date(
        `${tanggal}T00:00:00`
    );

    return date.toLocaleDateString(
        "id-ID",
        {
            day: "2-digit",
            month: "short",
            year: "numeric"
        }
    );
}


// =========================================================
// HELPER: SELISIH HARI
// =========================================================

function selisihHari(tanggalAwal, tanggalAkhir) {

    const awal = new Date(
        `${tanggalAwal}T00:00:00`
    );

    const akhir = new Date(
        `${tanggalAkhir}T00:00:00`
    );

    const diff =
        akhir.getTime() -
        awal.getTime();

    return Math.max(
        0,
        Math.floor(
            diff / 86400000
        )
    );
}


// =========================================================
// UPDATE JUMLAH DATA
// =========================================================

function updateDataCount() {

    const data = getData();

    const element =
        document.getElementById("dataCount");

    if (element) {
        element.textContent =
            data.length;
    }
}


// =========================================================
// 1. LOAD DATA AWAL
//
// Format:
// 2026-01-01, 7382
//
// Ekor = digit terakhir Hasil4D
// =========================================================

function loadDataAwal() {

    const textarea =
        document.getElementById(
            "spreadsheetData"
        );

    const text =
        textarea.value.trim();


    if (!text) {

        alert(
            "Masukkan data spreadsheet terlebih dahulu."
        );

        return;
    }


    const lines =
        text.split(/\r?\n/);

    const dataMap = new Map();

    let berhasil = 0;

    let dilewati = 0;


    lines.forEach(line => {

        line = line.trim();

        if (!line) {
            return;
        }


        const parts =
            line.split(",");


        if (parts.length < 2) {

            dilewati++;

            return;
        }


        const tanggal =
            parts[0].trim();

        const hasil4D =
            parts[1].trim();


        // Validasi tanggal
        if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {

            dilewati++;

            return;
        }


        // Ambil digit terakhir
        const lastDigit =
            hasil4D.match(/\d/g);


        if (!lastDigit || lastDigit.length === 0) {

            dilewati++;

            return;
        }


        const ekor =
            Number(
                lastDigit[
                    lastDigit.length - 1
                ]
            );


        if (
            !Number.isInteger(ekor) ||
            ekor < 0 ||
            ekor > 9
        ) {

            dilewati++;

            return;
        }


        // Jika tanggal sama,
        // data terbaru menggantikan data lama.
        dataMap.set(
            tanggal,
            {
                tanggal: tanggal,
                ekor: ekor
            }
        );


        berhasil++;

    });


    const data =
        Array.from(
            dataMap.values()
        );


    if (data.length === 0) {

        alert(
            "Tidak ada data valid yang ditemukan."
        );

        return;
    }


    saveData(data);


    alert(
        `Berhasil memuat ${data.length} data.\n` +
        `Baris valid: ${berhasil}\n` +
        `Dilewati: ${dilewati}`
    );


    analisa();

    gambarGrafik();

    updateTodayResult();

}


// =========================================================
// 2. TAMBAH DATA HARI INI
//
// TIDAK ADA LOCK JAM 17:00.
// User tetap bisa memasukkan / memperbarui
// result kapan saja.
// =========================================================

function tambahDataHariIni() {

    const tanggal =
        document.getElementById(
            "tanggalInput"
        ).value;

    const ekorValue =
        document.getElementById(
            "ekorInput"
        ).value;


    if (!tanggal) {

        alert(
            "Pilih tanggal terlebih dahulu."
        );

        return;
    }


    if (ekorValue === "") {

        alert(
            "Masukkan angka ekor 0-9."
        );

        return;
    }


    const ekor =
        Number(ekorValue);


    if (
        !Number.isInteger(ekor) ||
        ekor < 0 ||
        ekor > 9
    ) {

        alert(
            "Ekor harus berupa angka 0 sampai 9."
        );

        return;
    }


    let data = getData();


    // Cari apakah tanggal sudah ada
    const existingIndex =
        data.findIndex(
            item =>
                item.tanggal === tanggal
        );


    const newData = {
        tanggal: tanggal,
        ekor: ekor
    };


    if (existingIndex !== -1) {

        // Update result lama
        data[existingIndex] =
            newData;

    } else {

        // Tambahkan result baru
        data.push(newData);

    }


    saveData(data);


    // Tampilkan langsung Result Hari Ini
    updateTodayResult();


    // Refresh analisa
    analisa();

    gambarGrafik();


    // Feedback
    alert(
        `Result ${tanggal} berhasil disimpan.\n\n` +
        `Ekor: ${ekor}`
    );

}


// =========================================================
// 3. CEK WAKTU + COUNTDOWN
//
// Jam 17:00 BUKAN LOCK INPUT.
// Hanya digunakan sebagai countdown Result.
// =========================================================

function cekLockInput() {

    updateClock();

    updateResultCountdown();

    updateTodayResult();

}


// =========================================================
// UPDATE JAM SEKARANG
// =========================================================

function updateClock() {

    const clock =
        document.getElementById(
            "clockNow"
        );

    if (!clock) {
        return;
    }

    clock.textContent =
        getJakartaTime();

}


// =========================================================
// COUNTDOWN MENUJU 17:00 WIB
// =========================================================

function updateResultCountdown() {

    const countdown =
        document.getElementById(
            "countdownResult"
        );

    if (!countdown) {
        return;
    }


    const now =
        getJakartaDateTimeParts();


    const currentSeconds =
        (
            now.hour * 3600
        ) +
        (
            now.minute * 60
        ) +
        now.second;


    const resultSeconds =
        RESULT_HOUR * 3600;


    let remaining;


    if (currentSeconds < resultSeconds) {

        // Masih menuju result hari ini
        remaining =
            resultSeconds -
            currentSeconds;

    } else {

        // Result sudah lewat,
        // hitung menuju besok 17:00
        remaining =
            (
                24 * 3600 -
                currentSeconds
            ) +
            resultSeconds;
    }


    const hours =
        Math.floor(
            remaining / 3600
        );

    const minutes =
        Math.floor(
            (remaining % 3600) / 60
        );

    const seconds =
        remaining % 60;


    countdown.textContent =
        `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}


// =========================================================
// PAD ANGKA
// =========================================================

function pad(number) {

    return String(number)
        .padStart(2, "0");

}


// =========================================================
// UPDATE RESULT HARI INI
// =========================================================

function updateTodayResult() {

    const today =
        getJakartaDate();

    const data =
        getData();


    const result =
        data.find(
            item =>
                item.tanggal === today
        );


    const resultElement =
        document.getElementById(
            "todayResult"
        );

    const dateElement =
        document.getElementById(
            "todayDate"
        );


    if (!result) {

        resultElement.textContent =
            "—";

        dateElement.textContent =
            formatTanggal(today);

        return;
    }


    resultElement.textContent =
        result.ekor;

    dateElement.textContent =
        formatTanggal(
            result.tanggal
        );
}


// =========================================================
// 4. ANALISA
//
// Rumus WAJIB:
//
// Rata2 = TotalData / 10
// Frekuensi = jumlah kemunculan
// HariTelat = hari sejak terakhir muncul
// Skor = (Rata2 - Frekuensi) + (HariTelat / 2)
//
// Analisa menggunakan 10 data terakhir.
// =========================================================

function analisa() {

    const data =
        getData();


    const topContainer =
        document.getElementById(
            "topThree"
        );

    const strengthContainer =
        document.getElementById(
            "strengthGrid"
        );


    if (
        !topContainer ||
        !strengthContainer
    ) {
        return;
    }


    if (data.length === 0) {

        topContainer.innerHTML = `
            <div class="empty-analysis">
                Masukkan data untuk melihat analisa.
            </div>
        `;

        strengthContainer.innerHTML =
            createEmptyStrength();

        return;
    }


    // Ambil 10 data terakhir
    const last10 =
        data.slice(-10);


    // Sesuai rumus:
    // TotalData / 10
    const rata2 =
        last10.length / 10;


    const today =
        getJakartaDate();


    const analysis = [];


    // Hitung angka 0 sampai 9
    for (
        let number = 0;
        number <= 9;
        number++
    ) {

        const frequency =
            last10.filter(
                item =>
                    Number(item.ekor) === number
            ).length;


        // Cari kemunculan terakhir
        const occurrences =
            data.filter(
                item =>
                    Number(item.ekor) === number
            );


        let hariTelat;


        if (occurrences.length === 0) {

            // Belum pernah muncul
            // sejak data tersedia.
            if (data.length > 0) {

                hariTelat =
                    selisihHari(
                        data[0].tanggal,
                        today
                    );

            } else {

                hariTelat = 0;

            }

        } else {

            const lastOccurrence =
                occurrences[
                    occurrences.length - 1
                ];

            hariTelat =
                selisihHari(
                    lastOccurrence.tanggal,
                    today
                );
        }


        // RUMUS WAJIB
        const score =
            (
                rata2 -
                frequency
            ) +
            (
                hariTelat / 2
            );


        analysis.push({
            number,
            frequency,
            hariTelat,
            score
        });

    }


    // Urut skor terbesar
    const sorted =
        [...analysis].sort(
            (a, b) =>
                b.score - a.score
        );


    const top3 =
        sorted.slice(0, 3);


    // Hitung Strength
    const strengths =
        calculateStrength(analysis);


    // Render TOP 3
    renderTopThree(top3);


    // Render semua angka 0-9
    renderStrength(
        analysis,
        strengths
    );

}


// =========================================================
// HITUNG STRENGTH %
//
// CATATAN:
// Ini bukan probabilitas nyata.
// Ini adalah indeks relatif berdasarkan
// skor statistik 0-9.
// =========================================================

function calculateStrength(analysis) {

    const scores =
        analysis.map(
            item => item.score
        );


    const minScore =
        Math.min(...scores);

    const maxScore =
        Math.max(...scores);


    return analysis.map(item => {

        let percentage;


        if (maxScore === minScore) {

            percentage = 50;

        } else {

            const normalized =
                (
                    item.score -
                    minScore
                ) /
                (
                    maxScore -
                    minScore
                );


            /*
             * Range dibuat 50-98.
             * Jadi angka kuat tidak otomatis
             * terlihat sebagai probabilitas 100%.
             */
            percentage =
                Math.round(
                    50 +
                    normalized * 48
                );
        }


        return {
            ...item,
            percentage
        };

    });

}


// =========================================================
// RENDER TOP 3
// =========================================================

function renderTopThree(top3) {

    const container =
        document.getElementById(
            "topThree"
        );


    container.innerHTML =
        top3.map(
            (item, index) => {

                const rank =
                    index + 1;


                const kurang =
                    Math.max(
                        0,
                        Math.round(
                            10 -
                            item.frequency
                        )
                    );


                let status;


                if (rank === 1) {

                    status =
                        "STRONGEST";

                } else if (rank === 2) {

                    status =
                        "STRONG";

                } else {

                    status =
                        "WATCH";
                }


                return `

                    <div
                        class="ekor-card rank-${rank}"
                    >

                        <div class="rank-label">
                            #${rank} • ${status}
                        </div>

                        <div class="rank-number">
                            ${item.number}
                        </div>

                        <div>
                            <div class="score-label">
                                Score
                            </div>

                            <div class="score-value">
                                ${item.score.toFixed(2)}
                            </div>

                            <div class="reason">
                                Kurang ${kurang}x
                                & Telat ${item.hariTelat} Hari
                            </div>
                        </div>

                    </div>

                `;

            }
        ).join("");

}


// =========================================================
// RENDER STRENGTH 0-9
// =========================================================

function renderStrength(
    analysis,
    strengths
) {

    const container =
        document.getElementById(
            "strengthGrid"
        );


    const strongest =
        Math.max(
            ...strengths.map(
                item =>
                    item.percentage
            )
        );


    container.innerHTML =
        strengths.map(item => {

            let status =
                "NORMAL";


            if (
                item.percentage ===
                strongest
            ) {

                status =
                    "STRONGEST";

            } else if (
                item.percentage >= 80
            ) {

                status =
                    "STRONG";

            } else if (
                item.percentage >= 65
            ) {

                status =
                    "WATCH";
            }


            return `

                <div
                    class="strength-item
                    ${
                        status === "STRONGEST"
                            ? "strongest"
                            : ""
                    }"
                >

                    <div class="strength-number">
                        ${item.number}
                    </div>

                    <div class="strength-percent">
                        ${item.percentage}%
                    </div>

                    <div class="strength-status">
                        ${status}
                    </div>

                </div>

            `;

        }).join("");

}


// =========================================================
// EMPTY STRENGTH
// =========================================================

function createEmptyStrength() {

    let html = "";


    for (
        let i = 0;
        i <= 9;
        i++
    ) {

        html += `

            <div class="strength-item">

                <div class="strength-number">
                    ${i}
                </div>

                <div class="strength-percent">
                    -
                </div>

                <div class="strength-status">
                    NO DATA
                </div>

            </div>

        `;

    }


    return html;

}


// =========================================================
// 5. GRAFIK FREKUENSI
// =========================================================

function gambarGrafik() {

    const canvas =
        document.getElementById(
            "chartFreq"
        );


    if (!canvas) {
        return;
    }


    const data =
        getData();


    const last10 =
        data.slice(-10);


    const frequency =
        [];


    for (
        let number = 0;
        number <= 9;
        number++
    ) {

        frequency.push(
            last10.filter(
                item =>
                    Number(item.ekor) === number
            ).length
        );

    }


    // Hapus chart lama
    if (chartFreq) {

        chartFreq.destroy();

        chartFreq = null;
    }


    chartFreq =
        new Chart(
            canvas.getContext("2d"),
            {
                type: "bar",

                data: {

                    labels: [
                        "0", "1", "2", "3", "4",
                        "5", "6", "7", "8", "9"
                    ],

                    datasets: [
                        {
                            label:
                                "Frekuensi 10 Hari",

                            data:
                                frequency,

                            backgroundColor:
                                "#4FD1C5",

                            borderRadius:
                                7,

                            borderSkipped:
                                false
                        }
                    ]

                },

                options: {

                    responsive: true,

                    maintainAspectRatio:
                        false,

                    plugins: {

                        legend: {
                            display: false
                        },

                        tooltip: {

                            backgroundColor:
                                "#1A1D29",

                            titleColor:
                                "#F5F7FA",

                            bodyColor:
                                "#D8DCE7",

                            borderColor:
                                "rgba(212,175,55,0.15)",

                            borderWidth:
                                1

                        }

                    },

                    scales: {

                        x: {

                            grid: {
                                display: false
                            },

                            ticks: {
                                color: "#858B9B",

                                font: {
                                    family:
                                        "Poppins"
                                }
                            }

                        },

                        y: {

                            beginAtZero: true,

                            ticks: {

                                stepSize: 1,

                                color: "#858B9B",

                                font: {
                                    family:
                                        "Poppins"
                                }

                            },

                            grid: {

                                color:
                                    "rgba(255,255,255,0.04)"

                            }

                        }

                    }

                }

            }
        );

}


// =========================================================
// 6. SIMULASI 10 HARI
//
// Cek berapa dari 10 hasil terakhir
// yang termasuk TOP 3 berdasarkan analisa
// yang tersedia saat ini.
// =========================================================

function simulasi10Hari() {

    const data =
        getData();


    if (data.length < 3) {

        alert(
            "Data belum cukup untuk simulasi."
        );

        return;
    }


    const last10 =
        data.slice(-10);


    // Hitung analisa
    const analysis =
        calculateAnalysisForSimulation(
            data
        );


    const top3 =
        analysis
            .sort(
                (a, b) =>
                    b.score - a.score
            )
            .slice(0, 3)
            .map(
                item =>
                    item.number
            );


    let kena =
        0;


    last10.forEach(item => {

        if (
            top3.includes(
                Number(item.ekor)
            )
        ) {

            kena++;

        }

    });


    const percentage =
        Math.round(
            (
                kena /
                last10.length
            ) * 100
        );


    alert(
        `SIMULASI 10 HARI\n\n` +
        `TOP 3: ${top3.join(" • ")}\n\n` +
        `Kena TOP 3: ${kena} dari ${last10.length} hari\n` +
        `Coverage: ${percentage}%`
    );

}


// =========================================================
// ANALISA UNTUK SIMULASI
// =========================================================

function calculateAnalysisForSimulation(data) {

    const last10 =
        data.slice(-10);


    const rata2 =
        last10.length / 10;


    const today =
        getJakartaDate();


    const result = [];


    for (
        let number = 0;
        number <= 9;
        number++
    ) {

        const frequency =
            last10.filter(
                item =>
                    Number(item.ekor) === number
            ).length;


        const occurrences =
            data.filter(
                item =>
                    Number(item.ekor) === number
            );


        let hariTelat = 0;


        if (occurrences.length > 0) {

            const last =
                occurrences[
                    occurrences.length - 1
                ];

            hariTelat =
                selisihHari(
                    last.tanggal,
                    today
                );
        }


        const score =
            (
                rata2 -
                frequency
            ) +
            (
                hariTelat / 2
            );


        result.push({
            number,
            frequency,
            hariTelat,
            score
        });

    }


    return result;

}


// =========================================================
// 7. KALKULATOR ×100
// =========================================================

function kalkulator() {

    const input =
        document.getElementById(
            "calcInput"
        );


    const result =
        document.getElementById(
            "calcResult"
        );


    const value =
        Number(input.value);


    if (
        input.value === "" ||
        !Number.isFinite(value)
    ) {

        result.textContent =
            "Hasil: masukkan nominal.";

        return;
    }


    const total =
        value * 100;


    result.textContent =
        `Hasil: ${formatRupiah(total)}`;

}


// =========================================================
// FORMAT ANGKA
// =========================================================

function formatRupiah(number) {

    return new Intl.NumberFormat(
        "id-ID"
    ).format(number);

}


// =========================================================
// 8. RESET SEMUA DATA
// =========================================================

function resetData() {

    const confirmed =
        confirm(
            "Yakin ingin menghapus SEMUA data analisis?"
        );


    if (!confirmed) {
        return;
    }


    localStorage.removeItem(
        STORAGE_KEY
    );


    document.getElementById(
        "spreadsheetData"
    ).value = "";


    document.getElementById(
        "ekorInput"
    ).value = "";


    updateDataCount();

    updateTodayResult();

    analisa();

    gambarGrafik();


    alert(
        "Semua data berhasil dihapus."
    );

}


// =========================================================
// SET DEFAULT TANGGAL HARI INI
// =========================================================

function setDefaultDate() {

    const input =
        document.getElementById(
            "tanggalInput"
        );


    if (!input) {
        return;
    }


    input.value =
        getJakartaDate();

}


// =========================================================
// TAB SYSTEM
// =========================================================

function setupTabs() {

    const buttons =
        document.querySelectorAll(
            ".tab-button"
        );


    const contents =
        document.querySelectorAll(
            ".tab-content"
        );


    buttons.forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const target =
                    button.dataset.tab;


                buttons.forEach(btn => {

                    btn.classList.remove(
                        "active"
                    );

                });


                contents.forEach(content => {

                    content.classList.remove(
                        "active"
                    );

                });


                button.classList.add(
                    "active"
                );


                document
                    .getElementById(target)
                    .classList.add(
                        "active"
                    );

            }
        );

    });

}


// =========================================================
// AUTO REFRESH
//
// Jalan setiap 1 detik.
// Tidak melakukan lock input.
// =========================================================

function startClock() {

    cekLockInput();


    setInterval(
        cekLockInput,
        1000
    );

}


// =========================================================
// WINDOW ONLOAD
// =========================================================

window.onload = function () {

    setupTabs();

    setDefaultDate();

    updateDataCount();

    updateTodayResult();

    analisa();

    gambarGrafik();

    cekLockInput();

    startClock();

};