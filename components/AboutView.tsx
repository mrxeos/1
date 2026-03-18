import React, { useState, useEffect } from 'react';

interface ServerInfo {
    addresses: string[];
    port: number;
    platform: string;
    nodeVersion: string;
}

const AboutView: React.FC = () => {
    const [serverInfo, setServerInfo] = useState<ServerInfo | null>(null);

    useEffect(() => {
        fetch('/api/server-info')
            .then(res => res.json())
            .then(data => setServerInfo(data))
            .catch(err => console.error('Failed to fetch server info', err));
    }, []);

    const whatsappNumber = '201282556499';
    const whatsappLink = `https://wa.me/${whatsappNumber}`;

    return (
        <div className="card h-full flex-col overflow-y-auto">
            <h2 className="view-title text-primary border-b pb-3">عن المطور والتطبيق</h2>

            <div className="space-y-8 max-w-4xl mx-auto mt-6">
                {/* Network Access Section */}
                <section className="about-section bg-info-content border-info">
                    <h3 className="text-2xl font-semibold mb-4 text-info">الوصول عبر الشبكة المحلية (متعدد المستخدمين)</h3>
                    <p className="text-lg text-secondary leading-relaxed mb-4">
                        يمكنك استخدام هذا التطبيق من أجهزة متعددة في نفس الوقت داخل عيادتك دون الحاجة لإنترنت.
                    </p>
                    <div className="info-box-alt">
                        <h4 className="font-bold mb-2">كيفية الاتصال من أجهزة أخرى:</h4>
                        <ol className="list-decimal list-inside space-y-2 text-secondary">
                            <li>تأكد أن جميع الأجهزة متصلة بنفس شبكة الواي فاي أو الراوتر.</li>
                            <li>افتح المتصفح (Chrome أو Edge) على الجهاز الآخر.</li>
                            <li>اكتب أحد العناوين التالية في شريط العنوان:</li>
                        </ol>
                        <div className="mt-4 p-3 bg-surface rounded border border-dashed border-info">
                            {serverInfo && serverInfo.addresses.length > 0 ? (
                                <div className="space-y-2">
                                    {serverInfo.addresses.map(addr => (
                                        <div key={addr} className="flex justify-between items-center">
                                            <code className="text-xl font-mono text-primary select-all">http://{addr}:{serverInfo.port}</code>
                                            <span className="text-sm text-secondary">(عنوان الشبكة)</span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-secondary italic">جاري تحميل معلومات الشبكة...</p>
                            )}
                        </div>
                    </div>
                </section>

                {/* Developer Section */}
                <section className="about-section">
                    <h3 className="text-2xl font-semibold mb-4">المطور</h3>
                    <p className="text-lg text-secondary leading-relaxed mb-6">
                        تم تطوير هذا البرنامج بكل شغف واهتمام، وهو مخصص لتبسيط المهام اليومية في العيادات ودعم الأطباء في تقديم أفضل رعاية ممكنة.
                    </p>
                    <h4 className="text-xl font-semibold mb-3">للتواصل والدعم الفني</h4>
                    <p className="text-secondary mb-4">لأي استفسارات أو اقتراحات أو للحصول على الدعم الفني، لا تتردد في التواصل مباشرة عبر واتساب.</p>
                    <div className="flex items-center flex-wrap gap-4">
                        <a
                            href={whatsappLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-whatsapp"
                        >
                            <span className="icon-wrapper icon-lg">
                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.894 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.886-.001 2.269.655 4.398 1.919 6.22l-1.023 3.75z" />
                                </svg>
                            </span>
                            <span>تواصل عبر واتساب (01282556499)</span>
                        </a>
                        <div className="p-4 rounded text-lg font-semibold bg-surface border border-default">
                            أ/ محمد مختار القاضي
                        </div>
                    </div>

                    <div className="dua-section">
                        <p className="text-md text-secondary italic">
                            "سواء وصلك هذا البرنامج بطريقة مشروعة أو غير ذلك، أرجو أن لا تنساني من دعوة صالحة بظهر الغيب لي ولوالديّ وللمسلمين جميعًا."
                        </p>
                        <p className="mt-4 text-lg font-semibold text-primary">
                            "إِنَّمَا الْمُؤْمِنُونَ إِخْوَةٌ فَأَصْلِحُوا بَيْنَ أَخَوَيْكُمْ ۚ وَاتَّقُوا اللَّهَ لَعَلَّكُمْ تُرْحَمُونَ"
                        </p>
                    </div>

                </section>

                {/* Application Section */}
                <section className="about-section">
                    <h3 className="text-2xl font-semibold mb-4">عن تطبيق "عيادتي"</h3>
                    <p className="text-lg text-secondary leading-relaxed mb-6">
                        تطبيق "عيادتي" هو نظام متكامل مصمم خصيصاً لإدارة العيادات بكفاءة وسهولة. يهدف التطبيق إلى تبسيط سير العمل اليومي للطبيب، بدءًا من تسجيل بيانات المرضى ومتابعة زياراتهم، وصولاً إلى إصدار الوصفات الطبية الذكية وإدارة ماليات العيادة.
                    </p>
                    <h4 className="text-xl font-semibold mb-3">أبرز الميزات:</h4>
                    <ul className="feature-list">
                        <li>إدارة ملفات المرضى وسجل زيارات مفصل.</li>
                        <li>نظام وصفات طبية ذكي مع قوالب جاهزة.</li>
                        <li>إدارة الأدوية والبدائل المقترحة.</li>
                        <li>متابعة الإحصائيات اليومية والماليات الشهرية.</li>
                        <li>يعمل بكفاءة دون الحاجة لاتصال دائم بالإنترنت.</li>
                        <li>واجهة مستخدم سهلة وداعمة للغة العربية.</li>
                    </ul>
                </section>
            </div>
        </div>
    );
};

export default AboutView;