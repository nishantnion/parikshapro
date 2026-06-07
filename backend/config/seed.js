const bcrypt = require('bcryptjs');
require('dotenv').config();

const seed = async () => {
  const { sequelize, User, ExamCategory, Contest } = require('../models');

  try {
    await sequelize.authenticate();
    console.log('✅ DB connected');
    await sequelize.sync({ alter: true });
    console.log('✅ Tables synced');

    // Seed exam categories
    const categories = [
      { id: 'jee',     name: 'JEE Main',        name_hi: 'जेईई मेन',          icon: '⚙️', color: '#f7b731', subject: 'Engineering',     sections_config: [{ name: 'Physics', count: 30 }, { name: 'Chemistry', count: 30 }, { name: 'Mathematics', count: 30 }],                                                              total_questions: 90,  duration_minutes: 180, marking_scheme: { correct: 4,   wrong: -1    } },
      { id: 'jee_adv', name: 'JEE Advanced',     name_hi: 'जेईई एडवांस्ड',    icon: '🔬', color: '#e11d48', subject: 'Engineering',     sections_config: [{ name: 'Physics', count: 18 }, { name: 'Chemistry', count: 18 }, { name: 'Mathematics', count: 18 }],                                                              total_questions: 54,  duration_minutes: 180, marking_scheme: { correct: 3,   wrong: -1    } },
      { id: 'neet',    name: 'NEET UG',          name_hi: 'नीट यूजी',          icon: '⚕️', color: '#00d4aa', subject: 'Medical',         sections_config: [{ name: 'Physics', count: 45 }, { name: 'Chemistry', count: 45 }, { name: 'Botany', count: 45 }, { name: 'Zoology', count: 45 }],                                   total_questions: 180, duration_minutes: 200, marking_scheme: { correct: 4,   wrong: -1    } },
      { id: 'upsc',    name: 'UPSC CSE Prelims', name_hi: 'यूपीएससी सीएसई',   icon: '🏛️', color: '#a855f7', subject: 'Civil Services',  sections_config: [{ name: 'General Studies', count: 100 }, { name: 'CSAT', count: 80 }],                                                                                             total_questions: 180, duration_minutes: 240, marking_scheme: { correct: 2,   wrong: -0.67 } },
      { id: 'ibps',    name: 'IBPS PO',          name_hi: 'आईबीपीएस पीओ',     icon: '🏦', color: '#3b82f6', subject: 'Banking',         sections_config: [{ name: 'English Language', count: 30 }, { name: 'Quantitative Aptitude', count: 35 }, { name: 'Reasoning Ability', count: 35 }],                                  total_questions: 100, duration_minutes: 60,  marking_scheme: { correct: 1,   wrong: -0.25 } },
      { id: 'ssc',     name: 'SSC CGL',          name_hi: 'एसएससी सीजीएल',    icon: '📋', color: '#ff6b35', subject: 'SSC',             sections_config: [{ name: 'General Intelligence & Reasoning', count: 25 }, { name: 'General Awareness', count: 25 }, { name: 'Quantitative Aptitude', count: 25 }, { name: 'English Comprehension', count: 25 }], total_questions: 100, duration_minutes: 60,  marking_scheme: { correct: 2,   wrong: -0.5  } },
      { id: 'gate',    name: 'GATE CS',          name_hi: 'गेट सीएस',          icon: '💻', color: '#06b6d4', subject: 'IT Sector',       sections_config: [{ name: 'General Aptitude', count: 10 }, { name: 'Engineering Mathematics', count: 10 }, { name: 'Core CS', count: 45 }],                                          total_questions: 65,  duration_minutes: 180, marking_scheme: { correct: 1,   wrong: -0.33 } },
      { id: 'nda',     name: 'NDA',              name_hi: 'एनडीए',             icon: '⚔️', color: '#ef4444', subject: 'Defence',         sections_config: [{ name: 'Mathematics', count: 120 }, { name: 'General Ability Test', count: 150 }],                                                                                  total_questions: 270, duration_minutes: 300, marking_scheme: { correct: 2.5, wrong: -0.83 } },
      { id: 'rrb',     name: 'RRB NTPC',         name_hi: 'आरआरबी एनटीपीसी',  icon: '🚂', color: '#f97316', subject: 'Railways',        sections_config: [{ name: 'Mathematics', count: 30 }, { name: 'General Intelligence & Reasoning', count: 30 }, { name: 'General Awareness', count: 40 }],                            total_questions: 100, duration_minutes: 90,  marking_scheme: { correct: 1,   wrong: -0.33 } },
      { id: 'cat',     name: 'CAT',              name_hi: 'कैट',               icon: '📈', color: '#8b5cf6', subject: 'MBA',             sections_config: [{ name: 'Verbal Ability & RC', count: 24 }, { name: 'Data Interpretation & LR', count: 20 }, { name: 'Quantitative Aptitude', count: 22 }],                        total_questions: 66,  duration_minutes: 120, marking_scheme: { correct: 3,   wrong: -1    } },
      { id: 'cuet',    name: 'CUET UG',          name_hi: 'सीयूईटी यूजी',     icon: '🎓', color: '#10b981', subject: 'University',      sections_config: [{ name: 'Language', count: 40 }, { name: 'Domain Subject', count: 50 }, { name: 'General Test', count: 60 }],                                                      total_questions: 150, duration_minutes: 195, marking_scheme: { correct: 5,   wrong: -1    } },
    ];

    for (const cat of categories) {
      await ExamCategory.upsert(cat);
    }
    console.log('✅ Exam categories seeded');

    // Seed admin user
    const adminExists = await User.findOne({ where: { email: 'admin@parikshapro.in' } });
    if (!adminExists) {
      const password_hash = await bcrypt.hash('Admin@123', 12);
      await User.create({
        name: 'Admin', email: 'admin@parikshapro.in', password_hash,
        role: 'superadmin', is_verified: true, plan_type: 'elite',
        tests_remaining: 9999, referral_code: 'PPADMIN',
      });
      console.log('✅ Admin user created: admin@parikshapro.in / Admin@123');
    }

    // Seed sample contests
    const contestCount = await Contest.count();
    if (contestCount === 0) {
      const sunday = new Date();
      sunday.setDate(sunday.getDate() + (7 - sunday.getDay()) % 7 || 7);
      sunday.setHours(10, 0, 0, 0);

      const contests = [
        { title: 'JEE Sunday Grand Contest', exam_category_id: 'jee', scheduled_at: sunday, enrollment_fee: 11, duration_minutes: 180, status: 'registration_open', prize_description: { top3: '1 Month Pro', top10: '5 Free Tests' } },
        { title: 'NEET Weekly Blast', exam_category_id: 'neet', scheduled_at: new Date(sunday.getTime() + 2 * 3600000), enrollment_fee: 11, duration_minutes: 200, status: 'registration_open', prize_description: { top3: '1 Month Pro', top10: '5 Free Tests' } },
        { title: 'UPSC Aspirants Contest', exam_category_id: 'upsc', scheduled_at: new Date(sunday.getTime() + 4 * 3600000), enrollment_fee: 11, duration_minutes: 120, status: 'upcoming', prize_description: { top3: '1 Month Pro', top10: '5 Free Tests' } },
        { title: 'Banking Bonanza', exam_category_id: 'ibps', scheduled_at: new Date(sunday.getTime() + 7 * 24 * 3600000), enrollment_fee: 11, duration_minutes: 60, status: 'upcoming', prize_description: { top3: '1 Month Pro', top10: '5 Free Tests' } },
        { title: 'SSC CGL Mega Test', exam_category_id: 'ssc', scheduled_at: new Date(sunday.getTime() + 7 * 24 * 3600000 + 2 * 3600000), enrollment_fee: 11, duration_minutes: 60, status: 'upcoming', prize_description: { top3: '1 Month Pro', top10: '5 Free Tests' } },
      ];

      for (const c of contests) await Contest.create(c);
      console.log('✅ Sample contests seeded');
    }

    console.log('\n🚀 Database seeded successfully!');
    console.log('📧 Admin login: admin@parikshapro.in / Admin@123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  }
};

seed();
