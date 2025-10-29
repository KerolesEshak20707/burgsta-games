// أدوات مساعدة ووظائف إضافية للعبة

// ===== مساعد التخزين المحلي =====
class StorageHelper {
    static set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error('خطأ في حفظ البيانات:', error);
            return false;
        }
    }

    static get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error('خطأ في قراءة البيانات:', error);
            return defaultValue;
        }
    }

    static remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('خطأ في حذف البيانات:', error);
            return false;
        }
    }

    static clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('خطأ في مسح البيانات:', error);
            return false;
        }
    }
}

// ===== مساعد التاريخ والوقت =====
class DateHelper {
    static getTodayString() {
        return new Date().toDateString();
    }

    static isNewDay(savedDate) {
        return savedDate !== this.getTodayString();
    }

    static formatDateTime(date = new Date()) {
        return date.toLocaleString('ar-SA', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    }

    static getTimeUntilMidnight() {
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow - now;
    }
}

// ===== مساعد الصوت =====
class AudioHelper {
    constructor() {
        this.sounds = {};
        this.isMuted = StorageHelper.get('burgsta_muted', false);
    }

    preloadSound(key, url) {
        if (typeof Audio !== 'undefined') {
            this.sounds[key] = new Audio(url);
            this.sounds[key].preload = 'auto';
        }
    }

    playSound(key, volume = 1) {
        if (this.isMuted || !this.sounds[key]) return;
        
        try {
            this.sounds[key].volume = volume;
            this.sounds[key].currentTime = 0;
            this.sounds[key].play();
        } catch (error) {
            console.log('لا يمكن تشغيل الصوت:', error);
        }
    }

    toggleMute() {
        this.isMuted = !this.isMuted;
        StorageHelper.set('burgsta_muted', this.isMuted);
        return this.isMuted;
    }
}

// ===== مساعد التحليلات والإحصائيات =====
class AnalyticsHelper {
    static recordSpin() {
        const today = DateHelper.getTodayString();
        const spins = StorageHelper.get('burgsta_daily_spins', {});
        spins[today] = (spins[today] || 0) + 1;
        StorageHelper.set('burgsta_daily_spins', spins);
    }

    static recordWin(prizeName) {
        const today = DateHelper.getTodayString();
        const wins = StorageHelper.get('burgsta_daily_wins', {});
        
        if (!wins[today]) {
            wins[today] = {};
        }
        
        wins[today][prizeName] = (wins[today][prizeName] || 0) + 1;
        StorageHelper.set('burgsta_daily_wins', wins);
    }

    static getTodayStats() {
        const today = DateHelper.getTodayString();
        const spins = StorageHelper.get('burgsta_daily_spins', {});
        const wins = StorageHelper.get('burgsta_daily_wins', {});
        
        return {
            spins: spins[today] || 0,
            wins: wins[today] || {},
            totalWins: Object.values(wins[today] || {}).reduce((sum, count) => sum + count, 0)
        };
    }

    static getAllTimeStats() {
        const spins = StorageHelper.get('burgsta_daily_spins', {});
        const wins = StorageHelper.get('burgsta_daily_wins', {});
        
        const totalSpins = Object.values(spins).reduce((sum, count) => sum + count, 0);
        let totalWins = 0;
        let prizeBreakdown = {};
        
        Object.values(wins).forEach(dayWins => {
            Object.entries(dayWins).forEach(([prize, count]) => {
                totalWins += count;
                prizeBreakdown[prize] = (prizeBreakdown[prize] || 0) + count;
            });
        });
        
        return {
            totalSpins,
            totalWins,
            winRate: totalSpins > 0 ? (totalWins / totalSpins * 100).toFixed(1) : 0,
            prizeBreakdown
        };
    }
}

// ===== مساعد التحقق من الأخطاء =====
class ErrorHandler {
    static logError(error, context = '') {
        const errorInfo = {
            message: error.message,
            context: context,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href
        };
        
        console.error('خطأ في اللعبة:', errorInfo);
        
        // حفظ الأخطاء محلياً للمراجعة
        const errors = StorageHelper.get('burgsta_errors', []);
        errors.push(errorInfo);
        
        // الاحتفاظ بآخر 50 خطأ فقط
        if (errors.length > 50) {
            errors.splice(0, errors.length - 50);
        }
        
        StorageHelper.set('burgsta_errors', errors);
    }

    static getErrorLog() {
        return StorageHelper.get('burgsta_errors', []);
    }

    static clearErrorLog() {
        return StorageHelper.remove('burgsta_errors');
    }
}

// ===== مساعد الأداء =====
class PerformanceHelper {
    static measureStart(label) {
        if (performance && performance.mark) {
            performance.mark(`${label}-start`);
        }
    }

    static measureEnd(label) {
        if (performance && performance.mark && performance.measure) {
            performance.mark(`${label}-end`);
            performance.measure(label, `${label}-start`, `${label}-end`);
        }
    }

    static getMemoryInfo() {
        if (performance && performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1048576),
                total: Math.round(performance.memory.totalJSHeapSize / 1048576),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1048576)
            };
        }
        return null;
    }

    static checkSupport() {
        const support = {
            localStorage: typeof Storage !== 'undefined',
            webGL: !!window.WebGLRenderingContext,
            canvas: !!document.createElement('canvas').getContext,
            audio: typeof Audio !== 'undefined',
            fetch: typeof fetch !== 'undefined',
            promises: typeof Promise !== 'undefined'
        };
        
        return support;
    }
}

// ===== مساعد التطوير (للاختبار والتصحيح) =====
class DebugHelper {
    static resetGame() {
        const keys = ['burgsta_date', 'burgsta_daily_limits', 'burgsta_daily_spins', 'burgsta_daily_wins'];
        keys.forEach(key => StorageHelper.remove(key));
        console.log('تم إعادة تعيين اللعبة');
        window.location.reload();
    }

    static setTestDate(daysAgo = 1) {
        const testDate = new Date();
        testDate.setDate(testDate.getDate() - daysAgo);
        StorageHelper.set('burgsta_date', testDate.toDateString());
        console.log(`تم تعيين التاريخ إلى ${daysAgo} يوم مضت`);
    }

    static addPrizes(prizeName, count) {
        const limits = StorageHelper.get('burgsta_daily_limits', {});
        limits[prizeName] = (limits[prizeName] || 0) + count;
        StorageHelper.set('burgsta_daily_limits', limits);
        console.log(`تم إضافة ${count} من ${prizeName}`);
    }

    static getGameState() {
        return {
            date: StorageHelper.get('burgsta_date'),
            limits: StorageHelper.get('burgsta_daily_limits'),
            spins: StorageHelper.get('burgsta_daily_spins'),
            wins: StorageHelper.get('burgsta_daily_wins'),
            errors: StorageHelper.get('burgsta_errors'),
            support: PerformanceHelper.checkSupport(),
            stats: AnalyticsHelper.getAllTimeStats()
        };
    }

    static checkCurrentSettings() {
        console.log('📋 الإعدادات المحفوظة محلياً:');
        console.log('التاريخ:', StorageHelper.get('burgsta_date'));
        console.log('الحدود اليومية:', StorageHelper.get('burgsta_daily_limits'));
        
        if (window.gameManager && window.gameManager.settings) {
            console.log('📄 إعدادات الملف المحملة:');
            console.log('الحدود من الملف:', window.gameManager.settings.daily_limits);
            console.log('الاحتماليات:', window.gameManager.settings.probabilities);
        } else {
            console.log('⚠️ لم يتم تحميل إعدادات الملف بعد');
        }
    }

    static forceReloadSettings() {
        console.log('🔄 إجبار إعادة تحميل الإعدادات...');
        if (window.gameManager) {
            window.gameManager.loadSettings().then(success => {
                if (success) {
                    console.log('✅ تم تحميل الإعدادات الجديدة بنجاح');
                    console.log('الحدود الجديدة:', window.gameManager.settings.daily_limits);
                    // إعادة تهيئة الحدود اليومية
                    window.gameManager.initializeDailyLimits();
                    console.log('الحدود المتاحة الآن:', window.gameManager.dailyLimits);
                } else {
                    console.error('❌ فشل في تحميل الإعدادات');
                }
            });
        } else {
            console.error('❌ gameManager غير متوفر');
        }
    }

    static exportData() {
        const data = this.getGameState();
        const blob = new Blob([JSON.stringify(data, null, 2)], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `burgsta-game-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
}

// ===== تصدير للاستخدام العام =====
if (typeof window !== 'undefined') {
    window.BurgstaHelpers = {
        Storage: StorageHelper,
        Date: DateHelper,
        Audio: AudioHelper,
        Analytics: AnalyticsHelper,
        Error: ErrorHandler,
        Performance: PerformanceHelper,
        Debug: DebugHelper
    };
}

// إعداد معالج الأخطاء العام
window.addEventListener('error', (event) => {
    // تجاهل أخطاء favicon والموارد غير المهمة
    if (event.filename && (event.filename.includes('favicon') || event.filename.includes('404'))) {
        return;
    }
    
    ErrorHandler.logError(event.error || new Error(event.message), 'Global Error Handler');
});

window.addEventListener('unhandledrejection', (event) => {
    ErrorHandler.logError(new Error(event.reason), 'Unhandled Promise Rejection');
});