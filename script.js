// script.js

// Assume jalaali.js is included for jalaali.toJalaali, jalaali.jalaaliMonthLength, etc.

const currentMonthYearDisplay = document.getElementById('currentMonthYear');
const calendarGrid = document.getElementById('calendarGrid');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const appointmentModal = document.getElementById('appointmentModal');
const closeButton = document.querySelector('.close-button');
const modalDateDisplay = document.getElementById('modalDate');
const timeSlotsContainer = document.getElementById('timeSlots');
const saveAppointmentsBtn = document.getElementById('saveAppointments');

let currentShamsiDate; // Will store the current Shamsi date (year, month, day)

// Predefined appointment times
const appointmentTimes = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
    '20:00', '21:00'
];

// Function to get stored appointments from localStorage
function getAppointments() {
    return JSON.parse(localStorage.getItem('shamsiAppointments')) || {};
}

// Function to save appointments to localStorage
function saveAppointments(appointments) {
    localStorage.setItem('shamsiAppointments', JSON.stringify(appointments));
}

// Function to render the calendar
function renderCalendar() {
    calendarGrid.innerHTML = ''; // Clear previous days

    const today = new Date();
    const currentGregorianDate = jalaali.toGregorian(currentShamsiDate.jy, currentShamsiDate.jm, currentShamsiDate.jd);
    const firstDayOfMonthGregorian = new Date(currentGregorianDate.gy, currentGregorianDate.gm - 1, 1);
    const firstDayOfMonthShamsi = jalaali.toJalaali(firstDayOfMonthGregorian.getFullYear(), firstDayOfMonthGregorian.getMonth() + 1, firstDayOfMonthGregorian.getDate());

    const daysInMonth = jalaali.jalaaliMonthLength(firstDayOfMonthShamsi.jy, firstDayOfMonthShamsi.jm);
    const dayOfWeek = (firstDayOfMonthGregorian.getDay() + 1) % 7; // Adjust for Saturday start (0=Sat, 1=Sun, ..., 6=Fri)

    // Update current month and year display
    const monthNames = [
        'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
        'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
    ];
    currentMonthYearDisplay.textContent = `${monthNames[firstDayOfMonthShamsi.jm - 1]} ${firstDayOfMonthShamsi.jy}`;

    // Add empty divs for the days before the 1st of the month
    for (let i = 0; i < dayOfWeek; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('calendar-day', 'other-month');
        calendarGrid.appendChild(emptyDiv);
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        dayDiv.textContent = day;
        dayDiv.dataset.shamsiYear = firstDayOfMonthShamsi.jy;
        dayDiv.dataset.shamsiMonth = firstDayOfMonthShamsi.jm;
        dayDiv.dataset.shamsiDay = day;

        // Check if this day is today
        const todayShamsi = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());
        if (todayShamsi.jy === firstDayOfMonthShamsi.jy &&
            todayShamsi.jm === firstDayOfMonthShamsi.jm &&
            todayShamsi.jd === day) {
            dayDiv.classList.add('current-day');
        }

        // Check for existing appointments to highlight the day
        const appointments = getAppointments();
        const dateKey = `${firstDayOfMonthShamsi.jy}-${firstDayOfMonthShamsi.jm}-${day}`;
        if (appointments[dateKey] && Object.values(appointments[dateKey]).some(status => status === true)) {
            dayDiv.classList.add('has-appointments');
        }

        dayDiv.addEventListener('click', () => openAppointmentModal(dayDiv.dataset.shamsiYear, dayDiv.dataset.shamsiMonth, dayDiv.dataset.shamsiDay));
        calendarGrid.appendChild(dayDiv);
    }
}

// Function to open the appointment modal
function openAppointmentModal(year, month, day) {
    const dateKey = `${year}-${month}-${day}`;
    modalDateDisplay.textContent = `نوبت‌های ${year}/${month}/${day}`;
    timeSlotsContainer.innerHTML = ''; // Clear previous time slots

    const appointments = getAppointments();
    const dayAppointments = appointments[dateKey] || {};

    appointmentTimes.forEach(time => {
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('time-slot');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `slot-${time}`;
        checkbox.checked = dayAppointments[time] || false; // Set checked state based on stored data

        const label = document.createElement('label');
        label.setAttribute('for', `slot-${time}`);
        label.textContent = time;

        if (checkbox.checked) {
            slotDiv.classList.add('booked');
        }

        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                slotDiv.classList.add('booked');
            } else {
                slotDiv.classList.remove('booked');
            }
        });

        slotDiv.appendChild(checkbox);
        slotDiv.appendChild(label);
        timeSlotsContainer.appendChild(slotDiv);
    });

    saveAppointmentsBtn.onclick = () => {
        const newDayAppointments = {};
        timeSlotsContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            const time = checkbox.id.replace('slot-', '');
            newDayAppointments[time] = checkbox.checked;
        });
        appointments[dateKey] = newDayAppointments;
        saveAppointments(appointments);
        closeAppointmentModal();
        renderCalendar(); // Re-render calendar to update highlights
    };

    appointmentModal.style.display = 'flex'; // Show modal
}

// Function to close the appointment modal
function closeAppointmentModal() {
    appointmentModal.style.display = 'none';
}

// Event listeners for month navigation
prevMonthBtn.addEventListener('click', () => {
    currentShamsiDate.jm--;
    if (currentShamsiDate.jm < 1) {
        currentShamsiDate.jm = 12;
        currentShamsiDate.jy--;
    }
    renderCalendar();
});

nextMonthBtn.addEventListener('click', () => {
    currentShamsiDate.jm++;
    if (currentShamsiDate.jm > 12) {
        currentShamsiDate.jm = 1;
        currentShamsiDate.jy++;
    }
    renderCalendar();
});

// Close modal when close button is clicked
closeButton.addEventListener('click', closeAppointmentModal);

// Close modal when clicking outside the modal content
window.addEventListener('click', (event) => {
    if (event.target === appointmentModal) {
        closeAppointmentModal();
    }
});

// Initialize calendar with current Shamsi date
const now = new Date();
currentShamsiDate = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
renderCalendar();