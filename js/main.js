// 초대장 정보: 이 객체만 고치면 페이지 전체에 반영됩니다.
const EVENT = {
  honoree: 'OOO 님',                    // TODO: 주인공 호칭·성함 (예: '아버지 김OO 님')
  host: '자녀 일동 드림',                 // TODO: 초대하는 사람
  date: '2026-11-21T12:00:00+09:00',     // TODO: 시작 시간 확인 (현재 낮 12시로 임시 설정)
  placeName: '1967바다지음',
  address: '전남 여수시 오동도로 20',
  mapQuery: '여수 1967바다지음',           // 지도 검색어
};

const KST_OFFSET = 9 * 60 * 60 * 1000;
const DAY = 24 * 60 * 60 * 1000;
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

const eventTime = new Date(EVENT.date).getTime();
// 한국 시간 기준 날짜를 UTC 필드로 다루기 위한 Date
const eventKst = new Date(eventTime + KST_OFFSET);

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');

function formatTime(d) {
  const h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const period = h < 12 ? '오전' : h === 12 ? '낮' : '오후';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${period} ${h12}시${m ? ` ${m}분` : ''}`;
}

// ---------- 텍스트 채우기 ----------
function fillFields() {
  const y = eventKst.getUTCFullYear();
  const mo = eventKst.getUTCMonth() + 1;
  const d = eventKst.getUTCDate();
  const wd = WEEKDAYS[eventKst.getUTCDay()];

  const values = {
    honoree: EVENT.honoree,
    host: EVENT.host,
    placeName: EVENT.placeName,
    dateShort: `${y}. ${mo}. ${d}. ${wd}요일 ${formatTime(eventKst)}`,
    dateLong: `${y}년 ${mo}월 ${d}일 ${wd}요일<br>${formatTime(eventKst)}`,
    monthLabel: `${y}년 ${mo}월`,
  };

  document.querySelectorAll('[data-field]').forEach((el) => {
    const key = el.dataset.field;
    if (key === 'dateLong') el.innerHTML = values[key];
    else el.textContent = values[key];
  });
}

// ---------- 달력 ----------
function renderCalendar() {
  const y = eventKst.getUTCFullYear();
  const m = eventKst.getUTCMonth();
  const eventDay = eventKst.getUTCDate();
  const firstWeekday = new Date(Date.UTC(y, m, 1)).getUTCDay();
  const lastDate = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  const body = $('calendar-body');
  let row = document.createElement('tr');

  for (let i = 0; i < firstWeekday; i++) row.appendChild(document.createElement('td'));

  for (let day = 1; day <= lastDate; day++) {
    const weekday = (firstWeekday + day - 1) % 7;
    const td = document.createElement('td');
    const span = document.createElement('span');
    span.textContent = day;
    td.appendChild(span);
    if (weekday === 0) td.className = 'sun';
    if (weekday === 6) td.className = 'sat';
    if (day === eventDay) {
      td.classList.add('is-event');
      td.setAttribute('aria-label', `${day}일 잔칫날`);
    }
    row.appendChild(td);

    if (weekday === 6 || day === lastDate) {
      body.appendChild(row);
      row = document.createElement('tr');
    }
  }
}

// ---------- D-day ----------
// 일수는 시각이 아니라 한국 시간 자정 기준 날짜 차이로 계산
function kstMidnight(ms) {
  const k = new Date(ms + KST_OFFSET);
  return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate());
}

function updateDday() {
  const now = Date.now();
  const dayDiff = Math.round((kstMidnight(eventTime) - kstMidnight(now)) / DAY);
  const left = Math.max(0, eventTime - now);

  const badge = $('dday-badge');
  const msg = $('dday-msg');
  const clock = $('dday-clock');

  if (dayDiff > 0) {
    badge.textContent = `D-${dayDiff}`;
    msg.innerHTML = `잔칫날까지 <strong>${dayDiff}일</strong> 남았습니다`;
  } else if (dayDiff === 0) {
    badge.textContent = 'D-DAY';
    msg.textContent = left > 0 ? '오늘이 잔칫날입니다. 곧 뵙겠습니다.' : '오늘이 잔칫날입니다. 함께해 주셔서 고맙습니다.';
  } else {
    badge.textContent = `D+${-dayDiff}`;
    msg.textContent = '잔치를 마쳤습니다. 함께해 주셔서 고맙습니다.';
  }

  clock.hidden = left === 0;
  $('cd-days').textContent = Math.floor(left / DAY);
  $('cd-hours').textContent = pad(Math.floor((left % DAY) / 3600000));
  $('cd-mins').textContent = pad(Math.floor((left % 3600000) / 60000));
  $('cd-secs').textContent = pad(Math.floor((left % 60000) / 1000));
}

// ---------- 지도 ----------
function setupMap() {
  // 상호명은 검색에 안 나올 수 있어 주소를 우선 사용
  const q = encodeURIComponent(EVENT.address || EVENT.mapQuery);

  $('map-frame').src = `https://maps.google.com/maps?q=${q}&z=16&output=embed`;
  $('link-naver').href = `https://map.naver.com/p/search/${q}`;
  $('link-kakao').href = `https://map.kakao.com/link/search/${q}`;

  $('place-address').textContent = EVENT.address || '전남 여수시';
  $('copy-address').hidden = !EVENT.address;
  $('copy-address').addEventListener('click', () => copyText(EVENT.address, '주소를 복사했습니다'));
}

// ---------- 공유 ----------
function setupShare() {
  $('share-btn').addEventListener('click', async () => {
    const data = {
      title: document.title,
      text: `${EVENT.honoree}의 팔순 잔치에 초대합니다.`,
      url: location.href,
    };
    if (navigator.share) {
      try { await navigator.share(data); } catch (e) { /* 사용자가 취소 */ }
    } else {
      copyText(location.href, '초대장 링크를 복사했습니다');
    }
  });
}

async function copyText(text, doneMsg) {
  try {
    await navigator.clipboard.writeText(text);
    showToast(doneMsg);
  } catch (e) {
    showToast('복사하지 못했습니다. 길게 눌러 직접 복사해 주세요.');
  }
}

let toastTimer;
function showToast(text) {
  const t = $('toast');
  t.textContent = text;
  t.classList.add('is-show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('is-show'), 2200);
}

fillFields();
renderCalendar();
setupMap();
setupShare();
updateDday();
setInterval(updateDday, 1000);
