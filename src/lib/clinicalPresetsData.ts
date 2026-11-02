import { SpecialtyClinicalPreset } from '../types';

export const DEFAULT_SPECIALTY_PRESETS: Record<string, SpecialtyClinicalPreset> = {
  // 1. الباطنة العامة والجهاز الهضمي
  'spec-01': {
    specialty_id: 'spec-01',
    specialty_name: 'الباطنة العامة والجهاز الهضمي',
    diagnoses: [
      'نزلة معوية حادة (Acute Gastroenteritis)',
      'التهاب حاد بالمعدة وارتجاع مريئي (GERD)',
      'متلازمة القولون العصبي والانتفاخ (IBS)',
      'ارتفاع ضغط الدم الشرياني (Hypertension)',
      'داء السكري من النوع الثاني (Type 2 Diabetes)',
      'التهاب المسالك البولية وصديد البول (UTI)',
      'أنيميا وعوز الحديد وسوء التغذية (Iron Deficiency Anemia)',
      'دهون على الكبد واضطراب إنزيمات (Fatty Liver)',
      'قرحة المعدة والاثني عشر وجرثومة المعدة (H. Pylori Gastritis)',
      'نزلة برد والتهاب فيروسي حاد (URTI)',
    ],
    protocols: [
      {
        id: 'proto-ge-int',
        specialty_id: 'spec-01',
        name: 'نزلة معوية ومطهر معوي',
        latinName: 'Acute Gastroenteritis Protocol',
        diagnosis: 'نزلة معوية حادة (Acute Gastroenteritis)',
        notes: 'الإكثار من السوائل الدافئة والشوربة، محلول الجفاف، تجنب المسبكات والألبان لمدة 3 أيام.',
        medicines: [
          { name: 'أنتينال 200 مجم (Antinal)', dosage: 'كبسولة كل 6 ساعات بعد الأكل لمدة 5 أيام' },
          { name: 'فيسيرالجين (Visceralgine)', dosage: 'قرص 3 مرات قبل الأكل عند التقلصات' },
          { name: 'دانسيت 4 مجم (Danset)', dosage: 'قرص قبل الأكل بنصف ساعة مرتين يومياً لمدة 3 أيام' },
        ],
      },
      {
        id: 'proto-gerd-int',
        specialty_id: 'spec-01',
        name: 'حموضة وارتجاع مريء والتهاب معدة',
        latinName: 'GERD & Gastritis Protocol',
        diagnosis: 'التهاب حاد بالمعدة وارتجاع مريئي (GERD)',
        notes: 'الامتناع التام عن الحوادق، المقليات، المياه الغازية، الشاي والقهوة على معدة فارغة، والنوم بعد العشاء بساعتين.',
        medicines: [
          { name: 'كنترولوك 40 مجم (Controloc)', dosage: 'قرص صباحاً على الريق قبل الإفطار بنصف ساعة لمدة شهر' },
          { name: 'جافيسكون شراب (Gaviscon)', dosage: 'ملعقة كبيرة 3 مرات بعد الأكل وقبل النوم' },
          { name: 'موتينورم 10 مجم (Motinorm)', dosage: 'قرص قبل الوجبات بـ 15 دقيقة 3 مرات يومياً' },
        ],
      },
      {
        id: 'proto-htn-int',
        specialty_id: 'spec-01',
        name: 'ضبط ضغط الدم الشرياني المرتفع',
        latinName: 'Hypertension Management',
        diagnosis: 'ارتفاع ضغط الدم الشرياني (Hypertension)',
        notes: 'تقليل الملح في الطعام، قياس الضغط مرتين يومياً صباحاً ومساءً وتسجيله بجدول، المشي اليومي نصف ساعة.',
        medicines: [
          { name: 'كونكور 5 مجم (Concor)', dosage: 'قرص واحد يومياً صباحاً بعد الإفطار' },
          { name: 'إكسفورج 5/160 مجم (Exforge)', dosage: 'قرص واحد يومياً مساءً بانتظام' },
        ],
      },
      {
        id: 'proto-ibs-int',
        specialty_id: 'spec-01',
        name: 'تهيج القولون العصبي والانتفاخ',
        latinName: 'Irritable Bowel Syndrome Protocol',
        diagnosis: 'متلازمة القولون العصبي والانتفاخ (IBS)',
        notes: 'تجنب البقوليات والكرنب والبصل والتوتر العصبي، شرب الينسون والنعناع الدافئ.',
        medicines: [
          { name: 'كولوفيرين د (Coloverin D)', dosage: 'قرص 3 مرات قبل الوجبات بـ 20 دقيقة' },
          { name: 'ديسفلاتيل (Disflatyl)', dosage: 'قرصين للمضغ بعد الأكل 3 مرات يومياً' },
        ],
      },
    ],
    quick_drugs: [
      { name: 'بنادول 500 مجم (Panadol)', dosage: 'قرص واحد', frequency: '3 مرات بعد الأكل', duration: 'عند اللزوم' },
      { name: 'كنترولوك 40 مجم (Controloc)', dosage: 'قرص واحد', frequency: 'مرة واحدة على الريق قبل الإفطار', duration: 'لمدة شهر' },
      { name: 'أنتينال 200 مجم (Antinal)', dosage: 'كبسولة واحدة', frequency: '4 مرات يومياً بعد الأكل', duration: 'لمدة 5 أيام' },
      { name: 'فيسيرالجين (Visceralgine)', dosage: 'قرص واحد', frequency: '3 مرات قبل الأكل', duration: 'عند اللزوم' },
      { name: 'جافيسكون شراب (Gaviscon)', dosage: 'ملعقة كبيرة', frequency: '3 مرات بعد الأكل وقبل النوم', duration: 'لمدة أسبوعين' },
      { name: 'فلاجيل 500 مجم (Flagyl)', dosage: 'قرص واحد', frequency: '3 مرات وسط الأكل', duration: 'لمدة 7 أيام' },
      { name: 'كولوفيرين أ (Coloverin A)', dosage: 'قرص واحد', frequency: '3 مرات قبل الأكل بنصف ساعة', duration: 'لمدة أسبوعين' },
      { name: 'أوجمنتين 1 جم (Augmentin)', dosage: 'قرص واحد', frequency: 'كل 12 ساعة بعد الأكل', duration: 'لمدة 7 أيام' },
    ],
  },

  // 2. طب وجراحة العظام
  'spec-02': {
    specialty_id: 'spec-02',
    specialty_name: 'طب وجراحة العظام',
    diagnoses: [
      'خشونة مفصل الركبة والتهاب الغضاريف (Knee Osteoarthritis)',
      'آلام أسفل الظهر وعرق النسا (Lumbar Spondylosis / Sciatica)',
      'التهاب أوتار الكتف واختناق الوتر (Shoulder Tendinitis / Impingement)',
      'التواء حاد بأربطة الكاحل (Ankle Sprain)',
      'شوكة عظمية والتهاب باطن القدم (Plantar Fasciitis)',
      'تقلص عضلي حاد وتمزق ليفي (Muscle Spasm / Strain)',
      'هشاشة عظام ونقص فيتامين د (Osteoporosis / Vit D Def)',
      'متلازمة النفق الرسغي وتنميل اليد (Carpal Tunnel Syndrome)',
    ],
    protocols: [
      {
        id: 'proto-knee-ortho',
        specialty_id: 'spec-02',
        name: 'خشونة الركبة والتهاب المفاصل',
        latinName: 'Knee Osteoarthritis Protocol',
        diagnosis: 'خشونة مفصل الركبة والتهاب الغضاريف (Knee Osteoarthritis)',
        notes: 'إنقاص الوزن، تجنب الجلوس في وضع التربيع أو ثني الركبة فترات طويلة، كمادات ماء دافئ يومياً لمدة 15 دقيقة.',
        medicines: [
          { name: 'سيلبركس 200 مجم (Celebrex)', dosage: 'كبسولة واحدة يومياً بعد الغداء لمدة أسبوعين' },
          { name: 'مايوفين باسط عضلات (Myofen)', dosage: 'كبسولة مرتين بعد الأكل لمدة 10 أيام' },
          { name: 'جلوكوزامين بلس كبسول (Glucosamine)', dosage: 'قرص مرتين بعد الوجبات لمدة شهرين' },
          { name: 'أولفين جل دهان موضعي (Olfen Gel)', dosage: 'دهان موضعي على الركبة مرتين يومياً مع التدليك الخفيف' },
        ],
      },
      {
        id: 'proto-back-ortho',
        specialty_id: 'spec-02',
        name: 'آلام الظهر والفقرات والتقلص العضلي',
        latinName: 'Low Back Pain & Spasm Protocol',
        diagnosis: 'آلام أسفل الظهر وعرق النسا (Lumbar Spondylosis / Sciatica)',
        notes: 'الراحة على مرتبة طبية مستوية، تجنب حمل الأشياء الثقيلة والانحناء المفاجئ، عمل علاج طبيعي عند استقرار الحالة.',
        medicines: [
          { name: 'ديكلاك 75 مجم ممتد المفعول (Diclac Retard)', dosage: 'قرص واحد يومياً بعد العشاء لمدة 5 أيام' },
          { name: 'سيردالود 2 مجم (Sirdalud)', dosage: 'قرص واحد مساءً قبل النوم لمدة أسبوع' },
          { name: 'نيوروتون حقن فيتامين ب مركّب (Neuroton)', dosage: 'حقنة عضل كل 3 أيام لمدة أسبوعين' },
        ],
      },
      {
        id: 'proto-heel-ortho',
        specialty_id: 'spec-02',
        name: 'الشوكة العظمية والتهاب كعب القدم',
        latinName: 'Plantar Fasciitis Protocol',
        diagnosis: 'شوكة عظمية والتهاب باطن القدم (Plantar Fasciitis)',
        notes: 'استخدام فرش سيليكون طبي داخل الحذاء، دحرجة زجاجة ماء بارد مثلجة أسفل باطن القدم مرتين يومياً.',
        medicines: [
          { name: 'كاتفلام 50 مجم (Cataflam)', dosage: 'قرص مرتين يومياً بعد الأكل لمدة أسبوع' },
          { name: 'فيلدان كبسول (Feldene)', dosage: 'كبسولة واحدة بعد الفطار' },
          { name: 'ريباديل جل (Repadil Gel)', dosage: 'تدليك كعب القدم مرتين يومياً' },
        ],
      },
    ],
    quick_drugs: [
      { name: 'سيلبركس 200 مجم (Celebrex)', dosage: 'كبسولة واحدة', frequency: 'مرة واحدة بعد الغداء', duration: 'لمدة أسبوعين' },
      { name: 'كاتفلام 50 مجم (Cataflam)', dosage: 'قرص واحد', frequency: 'مرتين يومياً بعد الأكل', duration: 'لمدة 5 أيام' },
      { name: 'مايوفين باسط عضلات (Myofen)', dosage: 'كبسولة واحدة', frequency: 'مرتين بعد الأكل', duration: 'لمدة 10 أيام' },
      { name: 'سيردالود 2 مجم (Sirdalud)', dosage: 'قرص واحد', frequency: 'مساءً قبل النوم', duration: 'لمدة أسبوع' },
      { name: 'بروفين 600 مجم (Brufen)', dosage: 'قرص واحد', frequency: 'مرتين بعد الأكل', duration: 'عند اللزوم' },
      { name: 'نيوروتون أمبول (Neuroton)', dosage: 'أمبول عضل', frequency: 'كل 3 أيام', duration: 'لمدة أسبوعين' },
      { name: 'أولفين جل مساج (Olfen Gel)', dosage: 'دهان موضعي', frequency: 'مرتين يومياً مع تدليك خفيف', duration: 'لمدة 10 أيام' },
      { name: 'كالسيوم د3 (Osteocare)', dosage: 'قرص واحد', frequency: 'مرة واحدة بعد الغداء', duration: 'لمدة شهر' },
    ],
  },

  // 3. طب الأطفال وحديثي الولادة
  'spec-03': {
    specialty_id: 'spec-03',
    specialty_name: 'طب الأطفال وحديثي الولادة',
    diagnoses: [
      'نزلة معوية حادة وإسهال عند الأطفال (Pediatric Gastroenteritis)',
      'نزلة شعبية حادة وسعال (Acute Bronchitis in Children)',
      'نزلات برد وحمى والتهاب فيروسي (Pediatric URTI & Fever)',
      'التهاب الحلق واللوزتين الحاد (Acute Tonsillitis)',
      'التهاب الأذن الوسطى عند الأطفال (Acute Otitis Media)',
      'حساسية صدر وربو شعبي أطفال (Bronchial Asthma in Children)',
      'نزلة معوية وجفاف خفيف (Dehydration Risk)',
      'مغص وغازات الرضع (Infantile Colic)',
    ],
    protocols: [
      {
        id: 'proto-ge-ped',
        specialty_id: 'spec-03',
        name: 'نزلة معوية وإسهال أطفال',
        latinName: 'Pediatric Gastroenteritis Protocol',
        diagnosis: 'نزلة معوية حادة وإسهال عند الأطفال (Pediatric Gastroenteritis)',
        notes: 'إعطاء محلول الجفاف بملعقة بعد كل إسهال، استمرار الرضاعة الطبيعية، طعام مسلوق (بطاطس وجزر وأرز مسلوق).',
        medicines: [
          { name: 'أنتينال شراب (Antinal Susp)', dosage: '5 مل (ملعقة صغيرة) 3 مرات يومياً لمدة 5 أيام' },
          { name: 'هيدراسيك 10/30 مجم أكياس (Hydrassec)', dosage: 'كيس على ملعقة زبادي أو ماء 3 مرات يومياً لمدة 3 أيام' },
          { name: 'محلول بيديالايت / هيدروسيف للجفاف', dosage: 'نصف كوب بعد كل مرة إسهال بالفم ببطء' },
        ],
      },
      {
        id: 'proto-fever-ped',
        specialty_id: 'spec-03',
        name: 'خافض حرارة ونزلة برد واحتقان حلق',
        latinName: 'Pediatric Fever & URTI Protocol',
        diagnosis: 'نزلات برد وحمى والتهاب فيروسي (Pediatric URTI & Fever)',
        notes: 'كمادات ماء فاتر على جانبي الرقبة وتحت الإبط، الراحة التامة وتدفئة الطفل، شرب سوائل دافئة بكثرة.',
        medicines: [
          { name: 'سيتال شراب خافض حرارة (Cetal Susp)', dosage: 'جرعة حسب وزن الطفل كل 6 ساعات عند ارتفاع الحرارة' },
          { name: 'بروفين شراب أطفال (Brufen Susp)', dosage: 'جرعة بالتبادل مع الباراسيتامول كل 8 ساعات عند اللزوم' },
          { name: 'زيرتك نقط أطفال (Zyrtec Drops)', dosage: '5 نقط بالفم مساءً قبل النوم لمدة 5 أيام' },
        ],
      },
      {
        id: 'proto-tonsil-ped',
        specialty_id: 'spec-03',
        name: 'التهاب اللوزتين وصديد الحلق',
        latinName: 'Pediatric Tonsillitis Protocol',
        diagnosis: 'التهاب الحلق واللوزتين الحاد (Acute Tonsillitis)',
        notes: 'ممنوع المشروبات المثلجة، إكمال جرعة المضاد الحيوي كاملة حتى النهاية لمدة 7 أيام.',
        medicines: [
          { name: 'كلافيموكس 457 شراب (Clavimox Susp)', dosage: 'ملعقة صغيرة كل 12 ساعة بعد الأكل لمدة 7 أيام' },
          { name: 'سيتال شراب (Cetal)', dosage: 'ملعقة صغيرة 3 مرات لتسكين الألم وخفض الحرارة' },
          { name: 'بي بي سي بخاخ حلق أطفال (BBC Spray)', dosage: 'بخة واحدة على جانبي الحلق 3 مرات يومياً' },
        ],
      },
    ],
    quick_drugs: [
      { name: 'سيتال شراب (Cetal Susp)', dosage: 'حسب وزن الطفل', frequency: 'كل 6 ساعات عند الحرارة', duration: 'عند اللزوم' },
      { name: 'بروفين شراب أطفال (Brufen Susp)', dosage: '5 مل (ملعقة صغيرة)', frequency: '3 مرات بعد الرضاعة/الأكل', duration: 'عند اللزوم' },
      { name: 'أنتينال شراب (Antinal Susp)', dosage: '5 مل', frequency: '3 مرات بعد الأكل', duration: 'لمدة 5 أيام' },
      { name: 'كلافيموكس 457 شراب (Clavimox)', dosage: 'حسب الوزن والسن', frequency: 'كل 12 ساعة بعد الأكل', duration: 'لمدة 7 أيام' },
      { name: 'زيرتك نقط (Zyrtec Drops)', dosage: '5-10 نقط بالفم', frequency: 'مرة واحدة مساءً', duration: 'لمدة 5 أيام' },
      { name: 'أوتريفين بيبي سالين نقط أنف', dosage: 'نقطتان في كل فتحة أنف', frequency: 'قبل الرضاعة والنوم', duration: 'عند اللزوم' },
      { name: 'دنتينوكس شراب للمغص (Dentinox)', dosage: '2.5 مل بالفم', frequency: '3 مرات مع الرضعة', duration: 'عند التقلصات' },
    ],
  },

  // 4. الرمد وجراحة العيون
  'spec-04': {
    specialty_id: 'spec-04',
    specialty_name: 'الرمد وجراحة العيون',
    diagnoses: [
      'التهاب ملتحمة العين بكتيري (Bacterial Conjunctivitis)',
      'التهاب الملتحمة التحسسي والرمد الربيعي (Allergic Conjunctivitis)',
      'جفاف العين وإجهاد الشاشات (Dry Eye Syndrome)',
      'شحاذ العين وخراج الجفن (Stye / Hordeolum)',
      'احتقان وإجهاد إبصار وصداع عيني (Asthenopia)',
    ],
    protocols: [
      {
        id: 'proto-conj-eye',
        specialty_id: 'spec-04',
        name: 'التهاب الملتحمة البكتيري وإفرازات العين',
        latinName: 'Bacterial Conjunctivitis Protocol',
        diagnosis: 'التهاب ملتحمة العين بكتيري (Bacterial Conjunctivitis)',
        notes: 'غسل اليدين جيداً قبل وبعد استخدام القطرة، استخدام مناديل معقمة ذات استعمال واحد لمسح الإفرازات.',
        medicines: [
          { name: 'توبراكس قطرة عين (Tobrex Eye Drops)', dosage: 'نقطة واحدة في العين المصابة 4 مرات يومياً لمدة أسبوع' },
          { name: 'تيراميسين مرهم عين (Terramycin)', dosage: 'شريحة مرهم داخل الجفن السفلي قبل النوم' },
        ],
      },
      {
        id: 'proto-dry-eye',
        specialty_id: 'spec-04',
        name: 'جفاف العين وإجهاد الرؤية',
        latinName: 'Dry Eye Relief Protocol',
        diagnosis: 'جفاف العين وإجهاد الشاشات (Dry Eye Syndrome)',
        notes: 'أخذ فترات راحة أثناء استخدام الهاتف والكمبيوتر (قاعدة 20-20-20)، تجنب التعرض المباشر للمروحة والتكييف.',
        medicines: [
          { name: 'سيستان ألترا قطرة ترطيب (Systane Ultra)', dosage: 'نقطة واحدة في العينين 3 إلى 4 مرات يومياً عند اللزوم' },
        ],
      },
    ],
    quick_drugs: [
      { name: 'توبراكس قطرة عين (Tobrex)', dosage: 'نقطة في كل عين', frequency: '4 مرات يومياً', duration: 'لمدة أسبوع' },
      { name: 'سيستان ألترا قطرة مرطبة (Systane)', dosage: 'نقطة واحدة', frequency: '3 مرات يومياً', duration: 'عند اللزوم' },
      { name: 'باتانول قطرة حساسية (Patanol)', dosage: 'نقطة واحدة', frequency: 'مرتين يومياً', duration: 'لمدة 10 أيام' },
      { name: 'تيراميسين مرهم عين', dosage: 'شريحة صغيرة داخل الجفن', frequency: 'مرة واحدة قبل النوم', duration: 'لمدة 5 أيام' },
    ],
  },

  // 5. النساء والتوليد
  'spec-05': {
    specialty_id: 'spec-05',
    specialty_name: 'النساء والتوليد',
    diagnoses: [
      'متابعة حمل روتينية طبيعية (Normal Antenatal Follow-up)',
      'فقر دم وأنيميا الحمل (Gestational Iron Deficiency Anemia)',
      'التهابات مهبلية فطرية كانديدا (Candidal Vaginitis)',
      'التهابات مهبلية بكتيرية وإفرازات (Bacterial Vaginosis)',
      'غثيان وقيء الحمل في الشهور الأولى (Morning Sickness)',
      'متلازمة تكيس المبايض (PCOS)',
      'آلام وتقلصات الدورة الشهرية (Dysmenorrhea)',
      'التهاب المسالك البولية أثناء الحمل (UTI in Pregnancy)',
    ],
    protocols: [
      {
        id: 'proto-preg-supp',
        specialty_id: 'spec-05',
        name: 'مكملات وفيتامينات الحمل والأنيميا',
        latinName: 'Antenatal Supplements Protocol',
        diagnosis: 'متابعة حمل روتينية طبيعية (Normal Antenatal Follow-up)',
        notes: 'تناول الغذاء الصحي الغني بالحديد والكالسيوم والخضروات الورقية، الإكثار من الماء والسوائل.',
        medicines: [
          { name: 'فيروجلوبين كبسول حديد (Feroglobin)', dosage: 'كبسولة واحدة يومياً بعد الغداء بساعتين مع عصير ليمون أو برتقال' },
          { name: 'فوليك أسيد 500 ميكروجرام (Folic Acid)', dosage: 'قرص واحد يومياً صباحاً بانتظام' },
          { name: 'كالتشيو مكمل كالسيوم وفيتامين د (Caltrate)', dosage: 'قرص واحد يومياً بعد العشاء (مفصول عن الحديد بـ 4 ساعات)' },
        ],
      },
      {
        id: 'proto-vag-gyn',
        specialty_id: 'spec-05',
        name: 'التهابات مهبلية فطرية وحكة',
        latinName: 'Vaginitis Treatment Protocol',
        diagnosis: 'التهابات مهبلية فطرية كانديدا (Candidal Vaginitis)',
        notes: 'الحفاظ على جفاف المنطقة واستخدام الملابس القطنية، تجنب الغسولات العطرية القاسية.',
        medicines: [
          { name: 'جينو دكتارين 400 لبوس مهبلي (Gyno-Daktarin)', dosage: 'لبوسة مهبلية واحدة مساءً قبل النوم لمدة 3 أيام متتالية' },
          { name: 'جينو بيفاريل كريم موضعي (Gyno-Pevaryl)', dosage: 'دهان خارجي موضعي مرتين يومياً لمدة أسبوع' },
        ],
      },
    ],
    quick_drugs: [
      { name: 'فيروجلوبين كبسول (Feroglobin)', dosage: 'كبسولة واحدة', frequency: 'مرة واحدة يومياً بعد الغداء', duration: 'طوال فترة الحمل' },
      { name: 'فوليك أسيد 500 ميكروجرام', dosage: 'قرص واحد', frequency: 'مرة واحدة صباحاً', duration: 'يومياً' },
      { name: 'نافيدوكسين أقراص للغثيان (Navidoxine)', dosage: 'قرص واحد', frequency: 'مساءً قبل النوم وعند اللزوم', duration: 'عند الغثيان' },
      { name: 'جينو دكتارين لبوس مهبلي (Gyno-Daktarin)', dosage: 'لبوسة مهبلية', frequency: 'مساءً قبل النوم', duration: 'لمدة 3 أيام' },
      { name: 'أوجمنتين 1 جم (آمن للحوامل)', dosage: 'قرص واحد', frequency: 'كل 12 ساعة بعد الأكل', duration: 'لمدة 7 أيام' },
    ],
  },

  // 6. الأنف والأذن والحنجرة
  'spec-06': {
    specialty_id: 'spec-06',
    specialty_name: 'الأنف والأذن والحنجرة',
    diagnoses: [
      'التهاب الجيوب الأنفية الحاد والصداع (Acute Sinusitis)',
      'التهاب الأذن الوسطى الحاد (Acute Otitis Media)',
      'حساسية الأنف والجيوب والرشح (Allergic Rhinitis)',
      'التهاب الأذن الخارجية وانسداد الشمع (Otitis Externa / Impacted Cerumen)',
      'احتقان الحلق والبلعوم وبحة الصوت (Pharyngitis & Laryngitis)',
      'نزيف الأنف والرعاف البسيط (Epistaxis)',
    ],
    protocols: [
      {
        id: 'proto-sinus-ent',
        specialty_id: 'spec-06',
        name: 'التهاب الجيوب الأنفية الحاد',
        latinName: 'Acute Sinusitis Protocol',
        diagnosis: 'التهاب الجيوب الأنفية الحاد والصداع (Acute Sinusitis)',
        notes: 'استنشاق بخار ماء دافئ، غسيل الأنف بمحلول ملحي، تجنب التعرض للتيارات الهوائية الباردة والأتربة.',
        medicines: [
          { name: 'أوجمنتين 1 جم (Augmentin)', dosage: 'قرص كل 12 ساعة بعد الأكل لمدة أسبوع' },
          { name: 'كلارينيز أقراص (Clarinase)', dosage: 'قرص كل 12 ساعة بعد الأكل لمدة 5 أيام' },
          { name: 'أوتريفين بخاخ أنف كبار (Otrivin Spray)', dosage: 'بخة في كل فتحة أنف مرتين يومياً لمدة 5 أيام فقط (لا تزيد)' },
          { name: 'بروفين 400 مجم (Brufen)', dosage: 'قرص 3 مرات بعد الأكل لتسكين صداع الجيوب' },
        ],
      },
      {
        id: 'proto-ear-ent',
        specialty_id: 'spec-06',
        name: 'التهاب وآلام الأذن الوسطى',
        latinName: 'Otitis Media Protocol',
        diagnosis: 'التهاب الأذن الوسطى الحاد (Acute Otitis Media)',
        notes: 'الحرص الشديد على عدم دخول الماء إلى داخل الأذن أثناء الاستحمام أو الوضوء.',
        medicines: [
          { name: 'سبرودكس نقط أذن (Ciprodex Drops)', dosage: '3 نقط في الأذن المصابة 3 مرات يومياً لمدة أسبوع' },
          { name: 'أوتوكالم نقط لتسكين ألم الأذن (Otocalm)', dosage: 'نقطتان لتسكين الألم الحاد عند اللزوم' },
          { name: 'كاتفلام 50 مجم (Cataflam)', dosage: 'قرص مرتين بعد الأكل لمدة 4 أيام' },
        ],
      },
    ],
    quick_drugs: [
      { name: 'أوتريفين بخاخ أنف كبار (Otrivin)', dosage: 'بخة واحدة بكل فتحة أنف', frequency: 'مرتين يومياً', duration: 'لمدة 5 أيام فقط' },
      { name: 'كلارينيز أقراص (Clarinase)', dosage: 'قرص واحد', frequency: 'كل 12 ساعة بعد الأكل', duration: 'لمدة 5 أيام' },
      { name: 'زيرتك 10 مجم (Zyrtec)', dosage: 'قرص واحد', frequency: 'مساءً قبل النوم', duration: 'لمدة 10 أيام' },
      { name: 'أوتوكالم نقط أذن (Otocalm)', dosage: 'نقطتان بالأذن', frequency: '3 مرات عند اللزوم', duration: 'عند الألم' },
      { name: 'أوجمنتين 1 جم (Augmentin)', dosage: 'قرص واحد', frequency: 'كل 12 ساعة بعد الأكل', duration: 'لمدة 7 أيام' },
      { name: 'فيزيوثير غسول ماء بحر أنفي', dosage: 'بخة في كل فتحة أنف', frequency: '3 مرات يومياً قبل العلاج', duration: 'أسبوعين' },
    ],
  },
};

// Fallback General Presets (للأقسام العامة أو عند عدم العثور على تخصص محدد)
export const GENERAL_CLINICAL_PRESET: SpecialtyClinicalPreset = {
  specialty_id: 'general',
  specialty_name: 'العيادات العامة والطوارئ',
  diagnoses: [
    'نزلة معوية حادة (Acute Gastroenteritis)',
    'التهاب حاد بالمعدة وارتجاع مريئي (GERD)',
    'التهاب الشعب الهوائية الحاد (Acute Bronchitis)',
    'حساسية صدرية وربو شعبي (Bronchial Asthma)',
    'نزلة برد والتهاب فيروسي حاد (URTI)',
    'ارتفاع ضغط الدم الشرياني (Hypertension)',
    'داء السكري من النوع الثاني (Type 2 Diabetes)',
    'التهاب المفاصل وخشونة الركبة (Osteoarthritis)',
    'التهاب المسالك البولية (UTI)',
    'أنيميا وعوز الحديد (Iron Deficiency Anemia)',
  ],
  protocols: [
    {
      id: 'proto-ge-general',
      name: 'نزلة معوية حادة ومطهر معوي',
      latinName: 'Acute Gastroenteritis',
      diagnosis: 'نزلة معوية حادة (Acute Gastroenteritis)',
      notes: 'تجنب الأطعمة الدسمة ومنتجات الألبان، الإكثار من السوائل الدافئة ومحلول الجفاف والراحة التامة.',
      medicines: [
        { name: 'فيسيرالجين (Visceralgine)', dosage: 'قرص واحد 3 مرات يومياً قبل الأكل عند التقلصات' },
        { name: 'أنتينال 200 مجم (Antinal)', dosage: 'كبسولة واحدة 4 مرات يومياً بعد الأكل لمدة 5 أيام' },
        { name: 'دانسيت 4 مجم (Danset)', dosage: 'قرص واحد مرتين يومياً قبل الأكل بنصف ساعة لوقف القيء' },
      ],
    },
    {
      id: 'proto-cold-general',
      name: 'نزلة برد واحتقان حلق',
      latinName: 'Common Cold & Sore Throat',
      diagnosis: 'نزلة برد والتهاب فيروسي حاد (URTI)',
      notes: 'الراحة التامة، الإكثار من شرب السوائل الدافئة وعصير الليمون، تجنب التيارات الباردة.',
      medicines: [
        { name: 'بنادول كولد آند فلو (Panadol Cold & Flu)', dosage: 'قرص كل 8 ساعات بعد الأكل لمدة 5 أيام' },
        { name: 'أوجمنتين 1 جم (Augmentin)', dosage: 'قرص كل 12 ساعة بعد الأكل لمدة أسبوع' },
        { name: 'بي بي سي بخاخ للفم والحلق (BBC Spray)', dosage: 'بختين بالفم 3 مرات يومياً لتسكين ألم الحلق' },
      ],
    },
  ],
  quick_drugs: [
    { name: 'بنادول 500 مجم (Panadol)', dosage: 'قرص واحد', frequency: '3 مرات يومياً بعد الأكل', duration: 'لمدة 5 أيام' },
    { name: 'أوجمانتين 1 جم (Augmentin)', dosage: 'قرص واحد', frequency: 'كل 12 ساعة بعد الأكل', duration: 'لمدة 7 أيام' },
    { name: 'بروفين 400 مجم (Brufen)', dosage: 'قرص واحد', frequency: '3 مرات يومياً بعد الأكل', duration: 'عند اللزوم' },
    { name: 'كاتفلام 50 مجم (Cataflam)', dosage: 'قرص واحد', frequency: 'مرتين يومياً بعد الأكل', duration: 'لمدة 5 أيام' },
    { name: 'فلاجيل 500 مجم (Flagyl)', dosage: 'قرص واحد', frequency: '3 مرات يومياً وسط الأكل', duration: 'لمدة 7 أيام' },
    { name: 'كنترولوك 40 مجم (Controloc)', dosage: 'قرص واحد', frequency: 'مرة يومياً على الريق قبل الإفطار', duration: 'لمدة أسبوعين' },
  ],
};
