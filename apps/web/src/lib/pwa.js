// Fitur PWA: pemasangan aplikasi dan notifikasi push.
import { api } from '@/lib/api.js';

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

export function isIos() {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Mac') && 'ontouchend' in document);
}

export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from([...raw].map((char) => char.charCodeAt(0)));
}

async function registration() {
  const existing = await navigator.serviceWorker.getRegistration();
  return existing ?? navigator.serviceWorker.register('/sw.js');
}

// Status notifikasi untuk perangkat ini: unsupported | ios-install | server-off | denied | off | on
export async function pushStatus() {
  if (!pushSupported()) return isIos() && !isStandalone() ? 'ios-install' : 'unsupported';
  const { publicKey } = await api.pushPublicKey().catch(() => ({ publicKey: null }));
  if (!publicKey) return 'server-off';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.getRegistration();
  const subscription = await reg?.pushManager.getSubscription();
  return subscription ? 'on' : 'off';
}

export async function enablePush() {
  const { publicKey } = await api.pushPublicKey();
  if (!publicKey) throw new Error('Notifikasi belum diaktifkan di server. Hubungi pengelola aplikasi.');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Izin notifikasi ditolak. Aktifkan dari pengaturan peramban, lalu coba lagi.');
  const reg = await registration();
  await navigator.serviceWorker.ready;
  const subscription = (await reg.pushManager.getSubscription())
    ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(publicKey) }));
  await api.savePushSubscription(subscription.toJSON());
  return 'on';
}

export async function disablePush() {
  const reg = await navigator.serviceWorker.getRegistration();
  const subscription = await reg?.pushManager.getSubscription();
  if (subscription) {
    await api.deletePushSubscription(subscription.endpoint).catch(() => {});
    await subscription.unsubscribe();
  }
  return 'off';
}

// Prompt pemasangan (Chrome/Edge/Android). Safari iOS memakai menu Bagikan, jadi ditangani dengan petunjuk.
let deferredPrompt = null;
const listeners = new Set();
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  deferredPrompt = event;
  listeners.forEach((fn) => fn(true));
});
window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  listeners.forEach((fn) => fn(false));
});

export function onInstallAvailable(fn) {
  listeners.add(fn);
  fn(Boolean(deferredPrompt));
  return () => listeners.delete(fn);
}

export async function promptInstall() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  listeners.forEach((fn) => fn(false));
  return outcome === 'accepted';
}
