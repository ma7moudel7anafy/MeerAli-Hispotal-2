/**
 * أدوات النداء الصوتي للمرضى في مستوصف ميت علي الخيري
 * تشمل تشغيل نغمة المستشفى التنبيهية (Ding-Dong) عبر Web Audio API
 * ونطق اسم المريض ورقم دوره باللغة العربية عبر Web Speech API
 */

export function playHospitalChime(): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // النغمة الأولى (نغمة مرتفعة E5 659Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.25, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.45);

    // النغمة الثانية (نغمة منخفضة C5 523Hz)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(523.25, now + 0.28);
    gain2.gain.setValueAtTime(0.3, now + 0.28);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.85);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.28);
    osc2.stop(now + 0.85);
  } catch (err) {
    console.debug('Audio chime note:', err);
  }
}

export function announcePatientCall(options: {
  patientName: string;
  ticketNumber?: string | number;
  departmentName: string; // "معمل التحاليل" أو "قسم الأشعة"
  roomName?: string; // "غرفة سحب العينات" أو "غرفة الأشعة السينية"
}): void {
  // 1. تشغيل رنين المستشفى التنبيهي
  playHospitalChime();

  // 2. النطق الصوتي باللغة العربية بعد نصف ثانية من الرنين
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    setTimeout(() => {
      try {
        window.speechSynthesis.cancel();

        const dest = options.roomName || options.departmentName;
        const text = options.ticketNumber
          ? `دور رقم ${options.ticketNumber}، المريض ${options.patientName}، التوجه إلى ${dest}`
          : `المريض ${options.patientName}، التوجه إلى ${dest}`;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ar-EG';
        utterance.rate = 0.88; // نبرة هادئة ومفهومة للمرضى
        utterance.pitch = 1.05;

        // محاولة اختيار صوت عربي متاح بالجهاز إن وجد
        const voices = window.speechSynthesis.getVoices();
        const arabicVoice = voices.find(v => v.lang.startsWith('ar'));
        if (arabicVoice) {
          utterance.voice = arabicVoice;
        }

        window.speechSynthesis.speak(utterance);
      } catch (err) {
        console.debug('Speech announcement note:', err);
      }
    }, 450);
  }
}
