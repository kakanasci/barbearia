import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import {
    getDatabase,
    ref,
    get,
    set
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-database.js";

// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyCs6C-IroGVlIqCUa6XPvYliTmlVzaPgyU",
    authDomain: "bairros-c5d5b.firebaseapp.com",
    databaseURL: "https://bairros-c5d5b-default-rtdb.firebaseio.com",
    projectId: "bairros-c5d5b",
    storageBucket: "bairros-c5d5b.appspot.com",
    messagingSenderId: "765859348286",
    appId: "1:765859348286:web:bdc83cc3277ebc9f95766f",
    measurementId: "G-6C2NTSSVQ0"
};

// Inicialização do Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

document.addEventListener("DOMContentLoaded", () => {
    const nameInput = document.getElementById("name");
    const phoneInput = document.getElementById("phone");
    const emailInput = document.getElementById("email");
    const serviceSelect = document.getElementById("service");
    const timeSelect = document.getElementById("timeSelect");
    const dateSelect = document.getElementById("dateSelect");
    const paymentMethod = document.getElementById("paymentMethod");
    const mbwayDetails = document.getElementById("mbwayDetails");
    const mbwayProofInput = document.getElementById("mbwayProof");
    const barberSelect = document.getElementById("barber");

    paymentMethod.addEventListener("change", () => {
        mbwayDetails.style.display = paymentMethod.value === "mbway" ? "block" : "none";
    });

    barberSelect.addEventListener("change", generateTimes);
    dateSelect.addEventListener("change", generateTimes);

    async function checkAvailability(date, time, option, selectedBarber) {
        try {
            if (selectedBarber === "aleatorio") {
                const barbers = ["João Dias", "Rodrigo Lobo"];
                let isAvailable = false;
                for (const barber of barbers) {
                    const snapshot = await get(ref(db, `agendamentos/${date}/${barber}/${time}`));
                    if (!snapshot.exists()) {
                        isAvailable = true;
                        break;
                    }
                }
                if (!isAvailable) {
                    option.disabled = true;
                    option.textContent += " - Indisponível";
                }
            } else {
                const snapshot = await get(ref(db, `agendamentos/${date}/${selectedBarber}/${time}`));
                if (snapshot.exists()) {
                    option.disabled = true;
                    option.textContent += " - Indisponível";
                }
            }
        } catch (error) {
            console.error("Erro ao verificar horário:", error);
        }
    }

    function generateTimes() {
        const selectedDate = dateSelect.value;
        const selectedBarber = barberSelect.value;
        if (!selectedDate) return;

        timeSelect.innerHTML = '<option value="">Selecione um horário</option>';

        const [year, month, day] = selectedDate.split("-");
        const date = new Date(year, month - 1, day);
        const dayOfWeek = date.getDay();
        // 0 = Domingo, 1 = Segunda, ..., 6 = Sábado

        // Bloquear Domingo (0) e Segunda (1)
        if (dayOfWeek === 0 || dayOfWeek === 2) {
            const option = document.createElement("option");
            option.textContent = "Indisponível neste dia";
            option.disabled = true;
            timeSelect.appendChild(option);
            return;
        }

        for (let hour = 9; hour < 21; hour++) {
            for (let minute = 0; minute < 60; minute += 30) {
                // Pular horários entre 13:00 e 13:59
                if (hour === 13) continue;

                const time = `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
                const option = document.createElement("option");
                option.value = time;
                option.textContent = time;
                checkAvailability(selectedDate, time, option, selectedBarber);
                timeSelect.appendChild(option);
            }
        }
    }


    document.getElementById("bookingForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const selectedDate = dateSelect.value;
        const selectedTime = timeSelect.value;
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        const email = emailInput.value.trim();
        const service = serviceSelect.value;
        let barber = barberSelect.value;
        const payment = paymentMethod.value;

        // ⛔ Verifica se é domingo (0) ou segunda (1)
        const selectedDay = new Date(selectedDate).getDay();
        if (selectedDay === 0 || selectedDay === 1) {
            alert("❌ A barbearia está fechada aos domingos e segundas.");
            return;
        }

        if (!selectedDate || !selectedTime) return alert("Selecione data e horário!");
        if (!name || !service || !phone || !email || !payment) return alert("Preencha todos os campos!");

        const now = new Date();
        const selectedDateTime = new Date(`${selectedDate}T${selectedTime}`);
        if (selectedDateTime.getTime() < now.getTime()) {
            alert("⛔ Não é possível agendar para um horário que já passou.");
            return;
        }

        // ...continua o restante do seu código


        let proofBase64 = "";

        if (payment === "mbway") {
            const file = mbwayProofInput?.files?.[0];
            if (!file) {
                alert("Por favor, envie o comprovativo do pagamento.");
                return;
            }

            if (file.size > 3 * 1024 * 1024) {
                alert("O arquivo deve ter no máximo 3MB.");
                return;
            }

            try {
                proofBase64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = () => reject("Erro ao ler comprovativo.");
                    reader.readAsDataURL(file);
                });

                const preview = document.createElement("img");
                preview.src = proofBase64;
                preview.style.maxWidth = "150px";
                preview.style.marginTop = "10px";
                document.body.appendChild(preview);
            } catch (err) {
                console.error(err);
                alert("Erro ao processar comprovativo.");
                return;
            }
        }

        if (barber === "aleatorio") {
            const barbers = ["João Dias", "Rodrigo Lobo"];
            let availableBarber = null;
            for (const currentBarber of barbers) {
                const barberTimeRef = ref(db, `agendamentos/${selectedDate}/${currentBarber}/${selectedTime}`);
                const snapshot = await get(barberTimeRef);
                if (!snapshot.exists()) {
                    availableBarber = currentBarber;
                    break;
                }
            }
            if (!availableBarber) {
                alert("⚠️ Não há barbeiros disponíveis para este horário.");
                generateTimes();
                return;
            }
            barber = availableBarber;
        }

        const timeRef = ref(db, `agendamentos/${selectedDate}/${barber}/${selectedTime}`);

        try {
            const snapshot = await get(timeRef);
            if (snapshot.exists()) {
                alert("⚠️ Este horário acabou de ser reservado por outra pessoa.");
                generateTimes();
                return;
            }

            await set(timeRef, {
                name,
                service,
                phone,
                email,
                payment,
                barber,
                comprovativo: proofBase64 || null
            });

            e.target.reset();
            mbwayDetails.style.display = "none";
            alert("✅ Agendamento realizado com sucesso!");
            generateTimes();
        } catch (error) {
            console.error("Erro ao agendar:", error);
            alert("Erro ao realizar agendamento. Tente novamente.");
        }
    });

    if (dateSelect.value) generateTimes();
});


