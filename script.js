// script.js

// --- 1. وارد کردن توابع مورد نیاز Firebase ---
// این آدرس‌ها به نسخه 11.10.0 Firebase اشاره دارند.
// اگر Firebase نسخه جدیدتری به شما داد، می‌توانید این آدرس‌ها را به‌روز کنید.
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";
// از آنجایی که در این پروژه مستقیماً از Analytics استفاده نمی‌کنیم، خط زیر می‌تواند حذف شود تا کد مختصرتر شود.
// اگر بعداً نیاز داشتید، می‌توانید آن را برگردانید.
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-analytics.js";

// --- 2. تنظیمات Firebase (اینجا با کد Firebase شما جایگذاری شده است) ---
const firebaseConfig = {
    apiKey: "AIzaSyA5yAN0cxOn1mX0VoOlSdleu_2domrcXBo",
    authDomain: "scheduler-35ded.firebaseapp.com",
    projectId: "scheduler-35ded",
    storageBucket: "scheduler-35ded.firebasestorage.app",
    messagingSenderId: "594540660955",
    appId: "1:594540660955:web:7ca1dcd47fc36e7902a4fe",
    measurementId: "G-KJ280EECYM" // اگر getAnalytics را حذف کردید، این خط را هم می‌توانید حذف کنید
};

// --- 3. مقداردهی اولیه Firebase ---
const app = initializeApp(firebaseConfig);
const db = getFirestore(app); // دریافت سرویس Firestore برای تعامل با پایگاه داده
// اگر از analytics استفاده نمی‌کنید، خط زیر را حذف کنید:
// const analytics = getAnalytics(app);


// --- 4. انتخاب عناصر DOM (عناصر HTML که با جاوااسکریپت با آن‌ها کار می‌کنیم) ---
const currentMonthYearDisplay = document.getElementById('currentMonthYear');
const calendarGrid = document.getElementById('calendarGrid');
const prevMonthBtn = document.getElementById('prevMonth');
const nextMonthBtn = document.getElementById('nextMonth');
const appointmentModal = document.getElementById('appointmentModal');
const closeButton = document.querySelector('.close-button');
const modalDateDisplay = document.getElementById('modalDate');
const timeSlotsContainer = document.getElementById('timeSlots');
const saveAppointmentsBtn = document.getElementById('saveAppointments');

// --- 5. متغیرهای عمومی ---
let currentShamsiDate; // متغیری برای نگهداری تاریخ شمسی فعلی (سال، ماه، روز)

// زمان‌های از پیش تعریف شده برای نوبت‌دهی (یک ساعته، از 8 صبح تا 9 شب)
const appointmentTimes = [
    '08:00', '09:00', '10:00', '11:00', '12:00', '13:00',
    '14:00', '15:00', '16:00', '17:00', '18:00', '19:00',
    '20:00', '21:00'
];

// اسامی ماه‌های شمسی (برای نمایش در تقویم)
const monthNames = [
    'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
    'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

/**
 * --- 6. توابع مدیریت نوبت‌ها در Firestore ---
 * این توابع داده‌ها را از/به پایگاه داده Firestore می‌خوانند/می‌نویسند.
 */

// تابع برای دریافت نوبت‌های ذخیره شده برای یک تاریخ خاص از Firestore
// این تابع ناهمگام (async) است و یک Promise برمی‌گرداند.
async function getAppointmentsFromFirestore(dateKey) {
    try {
        // یک ارجاع به داکیومنت خاص در کالکشن 'appointments' ایجاد می‌کنیم
        const docRef = doc(db, 'appointments', dateKey);
        // داکیومنت را از Firestore دریافت می‌کنیم
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            // اگر داکیومنت وجود داشت، داده‌های آن را برمی‌گردانیم
            return docSnap.data();
        } else {
            // اگر داکیومنت وجود نداشت (یعنی نوبتی برای این تاریخ ثبت نشده)، یک شیء خالی برمی‌گردانیم
            console.log("No appointments for this date:", dateKey);
            return {};
        }
    } catch (error) {
        console.error("Error getting appointments:", error);
        return {}; // در صورت خطا، یک شیء خالی برمی‌گردانیم
    }
}

// تابع برای ذخیره نوبت‌ها برای یک تاریخ خاص در Firestore
// این تابع نیز ناهمگام (async) است.
async function saveAppointmentsToFirestore(dateKey, appointmentsData) {
    try {
        // داده‌های نوبت‌ها را در داکیومنت مربوط به آن تاریخ در کالکشن 'appointments' ذخیره (یا به‌روزرسانی) می‌کنیم
        await setDoc(doc(db, 'appointments', dateKey), appointmentsData);
        console.log("Appointments saved successfully for:", dateKey);
    } catch (error) {
        console.error("Error saving appointments:", error);
    }
}

/**
 * --- 7. تابع اصلی برای رندر کردن تقویم ---
 * این تابع مسئول ساخت و نمایش روزهای تقویم و هایلایت کردن روزهای دارای نوبت است.
 */
async function renderCalendar() { // این تابع باید async باشد زیرا getAppointmentsFromFirestore را فراخوانی می‌کند
    calendarGrid.innerHTML = ''; // پاک کردن تمام روزهای قبلی از گرید تقویم

    const today = new Date(); // دریافت تاریخ میلادی امروز
    // تبدیل تاریخ میلادی امروز به شمسی برای مقایسه و هایلایت کردن روز جاری
    const todayShamsi = jalaali.toJalaali(today.getFullYear(), today.getMonth() + 1, today.getDate());

    // تبدیل تاریخ شمسی فعلی (که کاربر در حال مشاهده آن است) به میلادی
    const currentGregorianDate = jalaali.toGregorian(currentShamsiDate.jy, currentShamsiDate.jm, currentShamsiDate.jd);
    // ساخت یک آبجکت Date میلادی برای اولین روز ماه میلادی متناظر با ماه شمسی فعلی
    const firstDayOfMonthGregorian = new Date(currentGregorianDate.gy, currentGregorianDate.gm - 1, 1);
    // تبدیل این تاریخ میلادی (اولین روز ماه) به شمسی
    const firstDayOfMonthShamsi = jalaali.toJalaali(
        firstDayOfMonthGregorian.getFullYear(),
        firstDayOfMonthGregorian.getMonth() + 1,
        firstDayOfMonthGregorian.getDate()
    );

    // محاسبه تعداد روزهای ماه شمسی فعلی با استفاده از jalaali-js
    const daysInMonth = jalaali.jalaaliMonthLength(firstDayOfMonthShamsi.jy, firstDayOfMonthShamsi.jm);
    // محاسبه روز هفته برای اولین روز ماه شمسی (0 = شنبه, ..., 6 = جمعه)
    const dayOfWeek = (firstDayOfMonthGregorian.getDay() + 1) % 7; // +1 برای شیفت دادن یکشنبه (0) به دوشنبه (1) و %7 برای نگه داشتن در محدوده 0-6

    // به‌روزرسانی عنوان ماه و سال در هدر تقویم
    currentMonthYearDisplay.textContent = `${monthNames[firstDayOfMonthShamsi.jm - 1]} ${firstDayOfMonthShamsi.jy}`;

    // اضافه کردن خانه‌های خالی (padding) برای روزهای قبل از 1ام ماه
    // این کار باعث می‌شود روز 1ام ماه در روز هفته صحیح قرار گیرد.
    for (let i = 0; i < dayOfWeek; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('calendar-day', 'other-month'); // کلاس 'other-month' برای عدم قابلیت کلیک
        calendarGrid.appendChild(emptyDiv);
    }

    // اضافه کردن روزهای واقعی ماه به تقویم
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        dayDiv.textContent = day;
        // ذخیره اطلاعات کامل تاریخ شمسی در dataset هر المان روز
        dayDiv.dataset.shamsiYear = firstDayOfMonthShamsi.jy;
        dayDiv.dataset.shamsiMonth = firstDayOfMonthShamsi.jm;
        dayDiv.dataset.shamsiDay = day;

        // بررسی اینکه آیا این روز، روز جاری (امروز) است و هایلایت کردن آن
        if (todayShamsi.jy === firstDayOfMonthShamsi.jy &&
            todayShamsi.jm === firstDayOfMonthShamsi.jm &&
            todayShamsi.jd === day) {
            dayDiv.classList.add('current-day');
        }

        // --- بررسی وجود نوبت‌های رزرو شده از Firestore برای هایلایت روزها ---
        const dateKey = `${firstDayOfMonthShamsi.jy}-${firstDayOfMonthShamsi.jm}-${day}`;
        const dayAppointments = await getAppointmentsFromFirestore(dateKey); // انتظار برای دریافت داده از Firestore
        // اگر حداقل یک نوبت برای این روز رزرو شده باشد (true باشد)، روز را هایلایت می‌کنیم
        if (Object.values(dayAppointments).some(status => status === true)) {
            dayDiv.classList.add('has-appointments');
        }

        // افزودن شنونده رویداد کلیک به هر روز
        dayDiv.addEventListener('click', () => {
            // فقط اگر روزی از ماه جاری باشد (نه خالی باشد)، مودال را باز می‌کنیم
            if (!dayDiv.classList.contains('other-month')) {
                openAppointmentModal(dayDiv.dataset.shamsiYear, dayDiv.dataset.shamsiMonth, dayDiv.dataset.shamsiDay);
            }
        });
        calendarGrid.appendChild(dayDiv); // اضافه کردن روز به گرید تقویم
    }
}

/**
 * --- 8. تابع برای باز کردن مودال نوبت‌دهی ---
 * این تابع مسئول نمایش مودال، پر کردن آن با اسلات‌های زمانی و وضعیت رزرو است.
 */
async function openAppointmentModal(year, month, day) { // این تابع باید async باشد
    const dateKey = `${year}-${month}-${day}`; // ساخت کلید منحصر به فرد برای تاریخ انتخابی
    modalDateDisplay.textContent = `نوبت‌های ${year}/${month}/${day}`; // نمایش تاریخ در عنوان مودال
    timeSlotsContainer.innerHTML = ''; // پاک کردن اسلات‌های زمانی قبلی در مودال

    // --- دریافت نوبت‌های این روز خاص از Firestore ---
    const dayAppointments = await getAppointmentsFromFirestore(dateKey); // انتظار برای دریافت داده

    // ایجاد و نمایش اسلات‌های زمانی از پیش تعریف شده
    appointmentTimes.forEach(time => {
        const slotDiv = document.createElement('div');
        slotDiv.classList.add('time-slot');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `slot-${time}`; // ID منحصر به فرد برای چک‌باکس
        // وضعیت چک‌باکس را بر اساس داده‌های دریافتی از Firestore تنظیم می‌کند (یا false اگر نوبت رزرو نشده باشد)
        checkbox.checked = dayAppointments[time] || false;

        const label = document.createElement('label');
        label.setAttribute('for', `slot-${time}`); // لینک کردن لیبل به چک‌باکس
        label.textContent = time; // نمایش زمان

        // اگر نوبت رزرو شده است، کلاس 'booked' را اضافه می‌کنیم تا استایل مربوطه اعمال شود
        if (checkbox.checked) {
            slotDiv.classList.add('booked');
        }

        // افزودن شنونده رویداد برای تغییر وضعیت چک‌باکس (فوراً ظاهر اسلات را به‌روز می‌کند)
        checkbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                slotDiv.classList.add('booked');
            } else {
                slotDiv.classList.remove('booked');
            }
        });

        slotDiv.appendChild(checkbox);
        slotDiv.appendChild(label);
        timeSlotsContainer.appendChild(slotDiv); // اضافه کردن اسلات به کانتینر
    });

    // --- تنظیم عملکرد دکمه ذخیره نوبت‌ها ---
    saveAppointmentsBtn.onclick = async () => { // این تابع نیز باید async باشد
        const newDayAppointments = {};
        // جمع‌آوری وضعیت جدید تمام چک‌باکس‌ها
        timeSlotsContainer.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            const time = checkbox.id.replace('slot-', ''); // استخراج زمان (مثلاً '08:00') از ID
            newDayAppointments[time] = checkbox.checked; // وضعیت رزرو را (true/false) ذخیره می‌کند
        });

        // --- ذخیره اطلاعات نوبت‌های به‌روز شده در Firestore ---
        await saveAppointmentsToFirestore(dateKey, newDayAppointments); // انتظار برای تکمیل عملیات ذخیره

        closeAppointmentModal(); // بستن مودال پس از ذخیره
        renderCalendar(); // رندر مجدد تقویم برای به‌روزرسانی هایلایت روزها
    };

    appointmentModal.style.display = 'flex'; // نمایش مودال (از 'flex' برای مرکزیت استفاده می‌شود)
}

/**
 * --- 9. تابع برای بستن مودال نوبت‌دهی ---
 */
function closeAppointmentModal() {
    appointmentModal.style.display = 'none';
}

/**
 * --- 10. شنونده‌های رویداد برای دکمه‌های ناوبری ماه (ماه قبل/بعد) ---
 */
prevMonthBtn.addEventListener('click', () => {
    currentShamsiDate.jm--; // کاهش شماره ماه شمسی
    if (currentShamsiDate.jm < 1) { // اگر ماه از 1 (فروردین) کمتر شد (به اسفند سال قبل رفتیم)
        currentShamsiDate.jm = 12; // ماه را به 12 (اسفند) تنظیم کن
        currentShamsiDate.jy--; // سال شمسی را یک واحد کم کن
    }
    renderCalendar(); // رندر مجدد تقویم با ماه جدید
});

nextMonthBtn.addEventListener('click', () => {
    currentShamsiDate.jm++; // افزایش شماره ماه شمسی
    if (currentShamsiDate.jm > 12) { // اگر ماه از 12 (اسفند) بیشتر شد (به فروردین سال بعد رفتیم)
        currentShamsiDate.jm = 1; // ماه را به 1 (فروردین) تنظیم کن
        currentShamsiDate.jy++; // سال شمسی را یک واحد زیاد کن
    }
    renderCalendar(); // رندر مجدد تقویم با ماه جدید
});

// بستن مودال با کلیک روی دکمه X (ضربدر)
closeButton.addEventListener('click', closeAppointmentModal);

// بستن مودال با کلیک در هر نقطه خارج از محتوای مودال
window.addEventListener('click', (event) => {
    if (event.target === appointmentModal) {
        closeAppointmentModal();
    }
});

/**
 * --- 11. مقداردهی اولیه برنامه هنگام بارگذاری صفحه ---
 * این خط کد اطمینان می‌دهد که تقویم بلافاصله پس از بارگذاری script.js نمایش داده می‌شود.
 */
// دریافت تاریخ میلادی فعلی
const now = new Date();
// تبدیل تاریخ میلادی فعلی به شمسی و ذخیره آن به عنوان تاریخ شروع تقویم
currentShamsiDate = jalaali.toJalaali(now.getFullYear(), now.getMonth() + 1, now.getDate());
// اولین بار تقویم را رندر کن
renderCalendar();
