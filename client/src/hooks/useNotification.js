import { useState, useEffect, useRef } from 'react';
import axios from 'axios';

async function getSwRegistration() {
  if (!('serviceWorker' in navigator)) return null;
  try {
    return await navigator.serviceWorker.ready;
  } catch {
    return null;
  }
}

async function subscribePush(registration) {
  try {
    const res = await axios.get('/api/push/vapid-key');
    const publicKey = res.data.publicKey;

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    await axios.post('/api/push/subscribe', { subscription });
    return subscription;
  } catch {
    return null;
  }
}

async function unsubscribePush(registration) {
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      await axios.post('/api/push/unsubscribe', { endpoint: subscription.endpoint });
      await subscription.unsubscribe();
    }
  } catch {
    // ignore
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function useNotification() {
  const [enabled, setEnabled] = useState(false);
  const swRef = useRef(null);

  useEffect(() => {
    getSwRegistration().then(reg => {
      swRef.current = reg;
    });
  }, []);

  const toggleNotification = async () => {
    const next = !enabled;

    if (next) {
      // iOS Safari 체크: PWA로 설치되지 않으면 푸시 불가
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
      if (isIOS && !isStandalone) {
        alert('iOS에서 알림을 받으려면\n"공유 → 홈 화면에 추가"로\nPWA 설치가 필요합니다.');
        return;
      }

      // 푸시 지원 여부 체크
      if (!('PushManager' in window)) {
        alert('이 브라우저에서는 푸시 알림을 지원하지 않습니다.');
        return;
      }

      // 켜기: 알림 권한 요청 + 서비스 워커 구독
      if ('Notification' in window && Notification.permission === 'default') {
        const result = await Notification.requestPermission();
        if (result !== 'granted') return;
      }
      if ('Notification' in window && Notification.permission === 'denied') {
        alert('알림이 차단되어 있습니다.\n브라우저 설정에서 알림을 허용해주세요.');
        return;
      }

      const reg = swRef.current || await getSwRegistration();
      if (reg) {
        await subscribePush(reg);
      }
    } else {
      // 끄기: 구독 해제
      const reg = swRef.current || await getSwRegistration();
      if (reg) {
        await unsubscribePush(reg);
      }
    }

    setEnabled(next);
    localStorage.setItem('notifyEnabled', next ? 'true' : 'false');
  };

  return { isActive: enabled, toggleNotification };
}
