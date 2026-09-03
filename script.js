const STORAGE_KEY = "dataAnalis2d";
const MAX_DATA = 365;

let chartFreq = null;
let lastTop3 = [];

function getData() {
    try {
        const data = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

        if (!Array.isArray(data)) {
            return [];
        }

        return data;
    } catch {
        return [];
    }
}

function saveData(data) {
    const sorted = data
        .sort((a, b) => a.tanggal.localeCompare(b.tanggal))
        .slice(-MAX_DATA);

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(sorted)
    );

    return sorted;
}

function parseTanggalIndonesia(value) {
    const parts = value.trim().split("-");

    if (parts.length !== 3) {
        return null;
    }

    const day = parts[0];
    const month = parts[1];
    const year = parts[2];

    if (
        !/^\d{2}$/.test(day) ||
        !/^\d{2}$/.test(month) ||
        !/^\d{4}$/.test(year)
    ) {
        return null;
    }

    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day)
    );

    if (
        date.getFullYear() !== Number(year) ||
        date.getMonth() !== Number(month) - 1 ||
        date.getDate() !== Number(day)
    ) {
        return null;
    }

    return `${year}-${month}-${day}`;
}

function parseTanggalInput(value) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return value;
    }

    return parseTanggalIndonesia(value);
}

function getJakartaDate() {
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
}

function getJakartaParts() {
    const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).formatToParts(new Date());

    const result = {};

    parts.forEach(part => {
        if (part.type !== "literal") {
            result[part.type] = part.value;
        }
    });

    return result;
}

function getJakartaDateTime() {
    const parts = getJakartaParts();

    return {
        year: Number(parts.year),
        month: Number(parts.month),
        day: Number(parts.day),
        hour: Number(parts.hour),
        minute: Number(parts.minute),
        second: Number(parts.second)
    };
}

function formatDate(date) {
    if (!date) {
        return "-";
    }

    const parts = date.split("-");

    if (parts.length !== 3) {
        return date;
    }

    return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function showToast(message) {
    const toast = document.getElementById("toast");

    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(window.toastTimer);

    window.toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2500);
}

function loadDataAwal() {
    const textarea =
        document.getElementById("spreadsheetData");

    const text = textarea.value.trim();

    if (!text) {
        showToast("Data spreadsheet masih kosong.");
        return;
    }

    const lines = text.split(/\r?\n/);
    const data = [];
    let invalid = 0;

    lines.forEach(line => {
        const cleanLine = line.trim();

        if (!cleanLine) {
            return;
        }

        let columns = cleanLine.split("\t");

        if (columns.length < 3) {
            columns = cleanLine.split(/\s{2,}/);
        }

        if (columns.length < 3) {
            invalid++;
            return;
        }

        const tanggalRaw = columns[0].trim();
        const kode = columns[1].trim();
        const hasil4D = columns[2]
            .trim()
            .replace(/\D/g, "");

        const tanggal =
            parseTanggalIndonesia(tanggalRaw);

        if (!tanggal) {
            invalid++;
            return;
        }

        if (!kode) {
            invalid++;
            return;
        }

        if (!/^\d{4}$/.test(hasil4D)) {
            invalid++;
            return;
        }

        const ekor =
            Number(hasil4D.slice(-1));

        data.push({
            tanggal,
            ekor
        });
    });

    if (!data.length) {
        showToast(
            "Format tidak valid. Gunakan: 01-01-2026[TAB]JNHB-583[TAB]5030"
        );
        return;
    }

    const unique = new Map();

    data.forEach(item => {
        unique.set(item.tanggal, item);
    });

    const saved =
        saveData(Array.from(unique.values()));

    textarea.value = "";

    analisa();
    gambarGrafik();

    if (invalid > 0) {
        showToast(
            `${saved.length} data dimuat. ${invalid} baris dilewati.`
        );
    } else {
        showToast(
            `${saved.length} data berhasil dimuat.`
        );
    }
}

function tambahDataHariIni() {
    const tanggal =
        document.getElementById("tanggalInput").value;

    const kode =
        document.getElementById("kodeInput").value.trim();

    const hasil =
        document.getElementById("hasilInput").value.trim();

    if (!tanggal) {
        showToast("Pilih tanggal terlebih dahulu.");
        return;
    }

    if (!kode) {
        showToast("Masukkan kode result.");
        return;
    }

    if (!/^\d{4}$/.test(hasil)) {
        showToast("Hasil harus terdiri dari 4 angka.");
        return;
    }

    const ekor =
        Number(hasil.slice(-1));

    const data = getData();

    const index =
        data.findIndex(
            item => item.tanggal === tanggal
        );

    const item = {
        tanggal,
        ekor
    };

    if (index >= 0) {
        data[index] = item;
    } else {
        data.push(item);
    }

    saveData(data);

    document.getElementById(
        "hasilInput"
    ).value = "";

    analisa();
    gambarGrafik();

    showToast(
        `Result ${hasil} tersimpan. Ekor ${ekor}.`
    );
}

function cekLockInput() {
    const update = () => {
        const now =
            getJakartaDateTime();

        const today =
            `${now.year}-${String(now.month).padStart(2, "0")}-${String(now.day).padStart(2, "0")}`;

        const tanggalInput =
            document.getElementById("tanggalInput");

        if (!tanggalInput.value) {
            tanggalInput.value = today;
        }

        const clock =
            `${String(now.hour).padStart(2, "0")}:${String(now.minute).padStart(2, "0")}:${String(now.second).padStart(2, "0")}`;

        document.getElementById(
            "clockWIB"
        ).textContent = clock;

        document.getElementById(
            "tanggalWIB"
        ).textContent = formatDate(today);

        const nowSeconds =
            now.hour * 3600 +
            now.minute * 60 +
            now.second;

        const resultSeconds =
            17 * 3600;

        let remaining;

        if (nowSeconds < resultSeconds) {
            remaining =
                resultSeconds - nowSeconds;
        } else {
            remaining =
                86400 -
                nowSeconds +
                resultSeconds;
        }

        document.getElementById(
            "countdownResult"
        ).textContent =
            formatCountdown(remaining);
    };

    update();

    if (!window.countdownTimer) {
        window.countdownTimer =
            setInterval(update, 1000);
    }
}

function formatCountdown(totalSeconds) {
    const hours =
        Math.floor(totalSeconds / 3600);

    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );

    const seconds =
        totalSeconds % 60;

    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function calculateScore(data, digit) {
    const lastTen =
        data.slice(-10);

    const totalData =
        lastTen.length;

    const rata2 =
        totalData / 10;

    const frekuensi =
        lastTen.filter(
            item => item.ekor === digit
        ).length;

    let hariTelat = 0;

    const reversed =
        [...data].reverse();

    const lastIndex =
        reversed.findIndex(
            item => item.ekor === digit
        );

    const currentDate =
        new Date(
            getJakartaDate() +
            "T00:00:00"
        );

    if (lastIndex === -1) {
        if (data.length > 0) {
            const lastDate =
                new Date(
                    data[data.length - 1].tanggal +
                    "T00:00:00"
                );

            hariTelat =
                Math.max(
                    0,
                    Math.floor(
                        (currentDate - lastDate) /
                        86400000
                    )
                );
        } else {
            hariTelat = 10;
        }
    } else {
        const lastDate =
            new Date(
                reversed[lastIndex].tanggal +
                "T00:00:00"
            );

        hariTelat =
            Math.max(
                0,
                Math.floor(
                    (currentDate - lastDate) /
                    86400000
                )
            );
    }

    const score =
        (rata2 - frekuensi) +
        (hariTelat / 2);

    return {
        digit,
        frekuensi,
        hariTelat,
        score
    };
}

function analisa() {
    const data =
        getData();

    document.getElementById(
        "dataCount"
    ).textContent =
        `${data.length} Data`;

    const latestResult =
        document.getElementById(
            "latestResult"
        );

    const latestDate =
        document.getElementById(
            "latestDate"
        );

    if (data.length) {
        const latest =
            data[data.length - 1];

        latestResult.textContent =
            latest.ekor;

        latestDate.textContent =
            formatDate(latest.tanggal);
    } else {
        latestResult.textContent =
            "----";

        latestDate.textContent =
            "Belum ada data";
    }

    if (!data.length) {
        renderEmptyTop3();
        return;
    }

    const scores = [];

    for (let digit = 0; digit <= 9; digit++) {
        scores.push(
            calculateScore(
                data,
                digit
            )
        );
    }

    scores.sort(
        (a, b) =>
            b.score - a.score
    );

    const top3 =
        scores.slice(0, 3);

    const minScore =
        Math.min(
            ...scores.map(
                item => item.score
            )
        );

    const maxScore =
        Math.max(
            ...scores.map(
                item => item.score
            )
        );

    lastTop3 =
        top3.map(
            item => item.digit
        );

    const normalized =
        top3.map(item => {
            let percentage = 50;

            if (
                maxScore !== minScore
            ) {
                percentage =
                    55 +
                    (
                        (item.score - minScore) /
                        (maxScore - minScore)
                    ) * 45;
            }

            percentage =
                Math.max(
                    1,
                    Math.min(
                        99,
                        Math.round(
                            percentage
                        )
                    )
                );

            return {
                ...item,
                percentage
            };
        });

    const container =
        document.getElementById(
            "topEkor"
        );

    container.innerHTML =
        normalized.map(
            (item, index) => {

                const kurang =
                    Math.max(
                        0,
                        10 - item.frekuensi
                    );

                let label =
                    "STRONGEST";

                if (index === 1) {
                    label = "STRONG";
                }

                if (index === 2) {
                    label = "WATCH";
                }

                return `
                    <div class="ekor-card">
                        <div class="rank">
                            ${index + 1}
                        </div>

                        <div class="ekor-number">
                            ${item.digit}
                        </div>

                        <div class="ekor-info">
                            <strong>
                                ${item.frekuensi === 0
                                    ? "Belum muncul"
                                    : `Muncul ${item.frekuensi}x`}
                            </strong>

                            <span>
                                Kurang ${kurang}x & Telat ${item.hariTelat} Hari
                            </span>
                        </div>

                        <div class="strength">
                            <strong>
                                ${item.percentage}%
                            </strong>

                            <span>
                                ${label}
                            </span>
                        </div>
                    </div>
                `;
            }
        ).join("");
}

function renderEmptyTop3() {
    const container =
        document.getElementById(
            "topEkor"
        );

    container.innerHTML =
        [1, 2, 3].map(
            rank => `
                <div class="ekor-card">
                    <div class="rank">
                        ${rank}
                    </div>

                    <div class="ekor-number">
                        -
                    </div>

                    <div class="ekor-info">
                        <strong>
                            Menunggu data
                        </strong>

                        <span>
                            Belum ada data analisa
                        </span>
                    </div>

                    <div class="strength">
                        <strong>
                            0%
                        </strong>

                        <span>
                            WAIT
                        </span>
                    </div>
                </div>
            `
        ).join("");
}

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

    const lastTen =
        data.slice(-10);

    const frequency =
        Array(10).fill(0);

    lastTen.forEach(item => {
        if (
            item.ekor >= 0 &&
            item.ekor <= 9
        ) {
            frequency[item.ekor]++;
        }
    });

    if (chartFreq) {
        chartFreq.destroy();
    }

    chartFreq =
        new Chart(
            canvas,
            {
                type: "bar",

                data: {
                    labels: [
                        "0",
                        "1",
                        "2",
                        "3",
                        "4",
                        "5",
                        "6",
                        "7",
                        "8",
                        "9"
                    ],

                    datasets: [{
                        label: "Frekuensi",
                        data: frequency,
                        backgroundColor: "#4FD1C5",
                        borderRadius: 6,
                        borderSkipped: false
                    }]
                },

                options: {
                    responsive: true,
                    maintainAspectRatio: false,

                    plugins: {
                        legend: {
                            display: false
                        },

                        tooltip: {
                            callbacks: {
                                label:
                                    function(context) {
                                        return ` Muncul ${context.raw}x`;
                                    }
                            }
                        }
                    },

                    scales: {
                        x: {
                            grid: {
                                display: false
                            },

                            ticks: {
                                color: "#7d879b",

                                font: {
                                    family: "Poppins",
                                    size: 10
                                }
                            }
                        },

                        y: {
                            beginAtZero: true,

                            ticks: {
                                stepSize: 1,
                                color: "#7d879b",

                                font: {
                                    family: "Poppins",
                                    size: 9
                                }
                            },

                            grid: {
                                color:
                                    "rgba(30,58,138,0.06)"
                            }
                        }
                    }
                }
            }
        );
}

function simulasi10Hari() {
    const data =
        getData();

    if (!data.length) {
        showToast(
            "Belum ada data untuk simulasi."
        );
        return;
    }

    analisa();

    const lastTen =
        data.slice(-10);

    const hit =
        lastTen.filter(
            item =>
                lastTop3.includes(
                    item.ekor
                )
        ).length;

    const percentage =
        Math.round(
            (hit / lastTen.length) * 100
        );

    showToast(
        `TOP 3 kena ${hit}/${lastTen.length} hari (${percentage}%).`
    );
}

function kalkulator() {
    const input =
        Number(
            document.getElementById(
                "angkaKalkulator"
            ).value
        );

    const result =
        document.getElementById(
            "hasilKalkulator"
        );

    if (!Number.isFinite(input)) {
        result.textContent =
            "Hasil: -";

        showToast(
            "Masukkan angka terlebih dahulu."
        );

        return;
    }

    const hasil =
        input * 100;

    result.textContent =
        `Hasil: ${hasil.toLocaleString("id-ID")}`;
}

function resetData() {
    const confirmed =
        confirm(
            "Yakin ingin menghapus semua data analisis?"
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
        "kodeInput"
    ).value = "";

    document.getElementById(
        "hasilInput"
    ).value = "";

    analisa();
    gambarGrafik();

    showToast(
        "Semua data berhasil dihapus."
    );
}

function setupTabs() {
    const buttons =
        document.querySelectorAll(
            ".tab-btn"
        );

    const contents =
        document.querySelectorAll(
            ".tab-content"
        );

    buttons.forEach(button => {
        button.addEventListener(
            "click",
            () => {

                buttons.forEach(item =>
                    item.classList.remove(
                        "active"
                    )
                );

                contents.forEach(item =>
                    item.classList.remove(
                        "active"
                    )
                );

                button.classList.add(
                    "active"
                );

                const target =
                    document.getElementById(
                        button.dataset.tab
                    );

                if (target) {
                    target.classList.add(
                        "active"
                    );
                }
            }
        );
    });
}

document.getElementById("hasilInput")
    ?.addEventListener("input", function() {
        this.value =
            this.value.replace(/\D/g, "")
                .slice(0, 4);
    });

window.onload = function() {
    setupTabs();

    document.getElementById(
        "tanggalInput"
    ).value =
        getJakartaDate();

    cekLockInput();
    analisa();
    gambarGrafik();
};