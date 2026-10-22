// One place for every icon in the deck and demos: Lucide SVGs inlined at build time.
import search from 'lucide-static/icons/search.svg?raw';
import calculator from 'lucide-static/icons/calculator.svg?raw';
import fileText from 'lucide-static/icons/file-text.svg?raw';
import notebook from 'lucide-static/icons/notebook.svg?raw';
import database from 'lucide-static/icons/database.svg?raw';
import globe from 'lucide-static/icons/globe.svg?raw';
import lock from 'lucide-static/icons/lock.svg?raw';
import megaphone from 'lucide-static/icons/megaphone.svg?raw';
import bookOpen from 'lucide-static/icons/book-open.svg?raw';
import newspaper from 'lucide-static/icons/newspaper.svg?raw';
import bot from 'lucide-static/icons/bot.svg?raw';
import utensils from 'lucide-static/icons/utensils.svg?raw';
import cloudSun from 'lucide-static/icons/cloud-sun.svg?raw';
import phone from 'lucide-static/icons/phone.svg?raw';
import send from 'lucide-static/icons/send.svg?raw';
import shield from 'lucide-static/icons/shield-check.svg?raw';
import warning from 'lucide-static/icons/triangle-alert.svg?raw';
import check from 'lucide-static/icons/check.svg?raw';
import userCheck from 'lucide-static/icons/user-check.svg?raw';
import user from 'lucide-static/icons/user.svg?raw';
import sparkles from 'lucide-static/icons/sparkles.svg?raw';
import briefcase from 'lucide-static/icons/briefcase.svg?raw';
import flask from 'lucide-static/icons/flask-conical.svg?raw';
import receipt from 'lucide-static/icons/receipt.svg?raw';
import users from 'lucide-static/icons/users.svg?raw';
import hand from 'lucide-static/icons/hand.svg?raw';
import repeat from 'lucide-static/icons/repeat.svg?raw';
import brain from 'lucide-static/icons/brain.svg?raw';
import messageCircle from 'lucide-static/icons/message-circle.svg?raw';
import wrench from 'lucide-static/icons/wrench.svg?raw';
import cpu from 'lucide-static/icons/cpu.svg?raw';
import play from 'lucide-static/icons/play.svg?raw';
import rotate from 'lucide-static/icons/rotate-ccw.svg?raw';
import braces from 'lucide-static/icons/braces.svg?raw';
import download from 'lucide-static/icons/download.svg?raw';
import mic from 'lucide-static/icons/mic.svg?raw';
import micOff from 'lucide-static/icons/mic-off.svg?raw';
import mapPin from 'lucide-static/icons/map-pin.svg?raw';
import calendarCheck from 'lucide-static/icons/calendar-check.svg?raw';
import eye from 'lucide-static/icons/eye.svg?raw';
import lightbulb from 'lucide-static/icons/lightbulb.svg?raw';
import handshake from 'lucide-static/icons/handshake.svg?raw';
import smartphone from 'lucide-static/icons/smartphone.svg?raw';
import zap from 'lucide-static/icons/zap.svg?raw';
import quote from 'lucide-static/icons/quote.svg?raw';
import listChecks from 'lucide-static/icons/list-checks.svg?raw';
import activity from 'lucide-static/icons/activity.svg?raw';
import x from 'lucide-static/icons/x.svg?raw';
import ghost from 'lucide-static/icons/ghost.svg?raw';
import pause from 'lucide-static/icons/pause.svg?raw';
import mail from 'lucide-static/icons/mail.svg?raw';
import banknote from 'lucide-static/icons/banknote.svg?raw';
import graduation from 'lucide-static/icons/graduation-cap.svg?raw';
import layers from 'lucide-static/icons/layers.svg?raw';
import arrowsLR from 'lucide-static/icons/arrow-left-right.svg?raw';
import calendar2 from 'lucide-static/icons/calendar.svg?raw';
import squareStop from 'lucide-static/icons/square.svg?raw';
import info from 'lucide-static/icons/info.svg?raw';

const ICONS = {
  search, calculator, file: fileText, notebook, database, globe, lock, megaphone, book: bookOpen, newspaper, bot, utensils, weather: cloudSun,
  phone, send, shield, warning, check, human: userCheck, user, sparkles, briefcase, flask, receipt, users, hand, repeat, brain, message: messageCircle,
  wrench, cpu, play, rotate, braces, download, mic, micOff, pin: mapPin, calendar: calendarCheck, eye, lightbulb, handshake, smartphone, zap, quote,
  list: listChecks, activity, x, ghost, calculatorPlain: calculator, pause, mail, banknote, graduation, layers, arrows: arrowsLR, calendarPlain: calendar2, stop: squareStop, info,
};

// Returns an inline <svg> for the icon, sized by the surrounding font-size. Unknown names render nothing.
export function icon(name, cls = '') {
  const svg = ICONS[name];
  if (!svg) return '';
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/class="[^"]*"/, `class="ic${cls ? ` ${cls}` : ''}" aria-hidden="true" focusable="false"`)
    .replace(/\s(width|height)="24"/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export const ICON_NAMES = Object.keys(ICONS);
