import express from 'express';
import cors from 'cors';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('clinic.db');
db.pragma('journal_mode = WAL');

// Initialize Database Tables
db.exec(`
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    fileNumber INTEGER UNIQUE,
    name TEXT NOT NULL,
    birthDate TEXT,
    gender TEXT,
    chronicComplaints TEXT,
    diseaseHistory TEXT,
    city TEXT,
    doctorNotes TEXT
  );

  CREATE TABLE IF NOT EXISTS visits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patientId INTEGER,
    date TEXT,
    createdAt INTEGER,
    type TEXT,
    weight REAL,
    temperature REAL,
    symptoms TEXT,
    diagnosis TEXT,
    prescriptionId INTEGER,
    followUpForVisitId INTEGER,
    price REAL,
    FOREIGN KEY (patientId) REFERENCES patients (id)
  );

  CREATE TABLE IF NOT EXISTS medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    form TEXT,
    dosages TEXT, -- JSON string
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS prescriptions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    visitId INTEGER,
    patientId INTEGER,
    items TEXT, -- JSON string
    doctorNotes TEXT,
    date TEXT,
    requiredTests TEXT,
    requiredScans TEXT,
    followUpDate TEXT,
    symptoms TEXT,
    FOREIGN KEY (visitId) REFERENCES visits (id),
    FOREIGN KEY (patientId) REFERENCES patients (id)
  );

  CREATE TABLE IF NOT EXISTS prescriptionTemplates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    items TEXT, -- JSON string
    diagnosis TEXT,
    doctorNotes TEXT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT,
    category TEXT,
    description TEXT,
    amount REAL
  );

  CREATE TABLE IF NOT EXISTS waitingList (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patientId INTEGER,
    patientName TEXT,
    patientFileNumber INTEGER,
    addedAt INTEGER,
    isEmergency INTEGER DEFAULT 0,
    FOREIGN KEY (patientId) REFERENCES patients (id)
  );

  CREATE TABLE IF NOT EXISTS symptoms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS diagnoses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT
  );
`);

// Migrations
try {
  db.prepare('ALTER TABLE waitingList ADD COLUMN isEmergency INTEGER DEFAULT 0').run();
} catch (e) {
  // Column already exists
}

// Seed default users if empty
const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number };
if (userCount.count === 0) {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('doctor', 'password', 'Doctor');
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('assistant', 'password', 'Assistant');
}

// Ensure display user exists
const displayUser = db.prepare('SELECT id FROM users WHERE username = ?').get('display');
if (!displayUser) {
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run('display', 'password', 'Display');
}

// Seed medicines if empty
const medicineCount = db.prepare('SELECT COUNT(*) as count FROM medicines').get() as { count: number };
if (medicineCount.count === 0) {
  const defaultMedicines = [
    { name: 'Cetal Syrup', form: 'شراب', dosages: JSON.stringify(['٥ مل كل ٦ ساعات', '٣ مل كل ٨ ساعات']), notes: 'خافض للحرارة ومسكن' },
    { name: 'Amoxil Syrup', form: 'شراب', dosages: JSON.stringify(['حسب الوزن', '٥ مل كل ٨ ساعات']), notes: 'مضاد حيوي واسع المجال' },
    { name: 'Brufen Syrup', form: 'شراب', dosages: JSON.stringify(['٥ مل عند اللزوم']), notes: 'مسكن ومضاد للالتهاب' },
    { name: 'Zyrtec Drops', form: 'نقط', dosages: JSON.stringify(['٥ نقط بالفم مساءا']), notes: 'مضاد للحساسية' },
    { name: 'Augmentin Tabs', form: 'أقراص', dosages: JSON.stringify(['قرص ٦٢٥ كل ١٢ ساعة']), notes: 'مضاد حيوي' },
    { name: 'Ventolin Inhaler', form: 'بخاخ', dosages: JSON.stringify(['بخاخ عند اللزوم']), notes: 'موسع للشعب الهوائية' },
  ];
  const insertMed = db.prepare('INSERT INTO medicines (name, form, dosages, notes) VALUES (?, ?, ?, ?)');
  for (const med of defaultMedicines) {
    insertMed.run(med.name, med.form, med.dosages, med.notes);
  }
}

// Seed symptoms if empty
const symptomCount = db.prepare('SELECT COUNT(*) as count FROM symptoms').get() as { count: number };
if (symptomCount.count === 0) {
  const defaultSymptoms = ['سخونية', 'كحة', 'رشح', 'إسهال', 'ترجيع', 'مغص', 'ضيق تنفس', 'ألم بالأذن'];
  const insertSymptom = db.prepare('INSERT INTO symptoms (name) VALUES (?)');
  for (const s of defaultSymptoms) {
    insertSymptom.run(s);
  }
}

// Seed diagnoses if empty
const diagnosisCount = db.prepare('SELECT COUNT(*) as count FROM diagnoses').get() as { count: number };
if (diagnosisCount.count === 0) {
  const defaultDiagnoses = ['نزلة برد', 'التهاب شعبي', 'نزلة معوية', 'التهاب بالأذن الوسطى', 'حساسية صدر', 'التهاب بالحلق'];
  const insertDiagnosis = db.prepare('INSERT INTO diagnoses (name) VALUES (?)');
  for (const d of defaultDiagnoses) {
    insertDiagnosis.run(d);
  }
}

// Seed patients if empty
const patientCount = db.prepare('SELECT COUNT(*) as count FROM patients').get() as { count: number };
if (patientCount.count === 0) {
  const defaultPatients = [
    { name: 'أحمد محمد علي', birthDate: '2020-05-15', gender: 'ذكر', city: 'القاهرة', fileNumber: 1001 },
    { name: 'سارة محمود حسن', birthDate: '2021-08-20', gender: 'أنثى', city: 'الجيزة', fileNumber: 1002 },
    { name: 'ياسين إبراهيم كمال', birthDate: '2019-02-10', gender: 'ذكر', city: 'القاهرة', fileNumber: 1003 },
  ];
  const insertPatient = db.prepare('INSERT INTO patients (name, birthDate, gender, city, fileNumber) VALUES (?, ?, ?, ?, ?)');
  for (const p of defaultPatients) {
    insertPatient.run(p.name, p.birthDate, p.gender, p.city, p.fileNumber);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // API Routes
  
  // Patients
  app.get('/api/patients', (req, res) => {
    const patients = db.prepare('SELECT * FROM patients').all();
    res.json(patients);
  });

  app.get('/api/patients/:id', (req, res) => {
    const patient = db.prepare('SELECT * FROM patients WHERE id = ?').get(req.params.id);
    res.json(patient);
  });

  app.post('/api/patients', (req, res) => {
    const { name, birthDate, gender, chronicComplaints, diseaseHistory, city, doctorNotes } = req.body;
    const lastPatient = db.prepare('SELECT fileNumber FROM patients ORDER BY fileNumber DESC LIMIT 1').get() as { fileNumber: number } | undefined;
    const nextFileNumber = lastPatient ? lastPatient.fileNumber + 1 : 1001;
    
    const result = db.prepare(`
      INSERT INTO patients (fileNumber, name, birthDate, gender, chronicComplaints, diseaseHistory, city, doctorNotes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(nextFileNumber, name, birthDate, gender, chronicComplaints, diseaseHistory, city, doctorNotes || '');
    
    res.json({ id: result.lastInsertRowid, fileNumber: nextFileNumber });
  });

  app.put('/api/patients/:id', (req, res) => {
    const { name, birthDate, gender, chronicComplaints, diseaseHistory, city, doctorNotes } = req.body;
    db.prepare(`
      UPDATE patients 
      SET name = ?, birthDate = ?, gender = ?, chronicComplaints = ?, diseaseHistory = ?, city = ?, doctorNotes = ?
      WHERE id = ?
    `).run(name, birthDate, gender, chronicComplaints, diseaseHistory, city, doctorNotes, req.params.id);
    res.json({ success: true });
  });

  // Visits
  app.get('/api/visits', (req, res) => {
    const visits = db.prepare('SELECT * FROM visits ORDER BY date DESC').all();
    res.json(visits);
  });

  app.get('/api/visits/patient/:patientId', (req, res) => {
    const visits = db.prepare('SELECT * FROM visits WHERE patientId = ? ORDER BY date DESC').all(req.params.patientId);
    res.json(visits);
  });

  app.get('/api/visits/month', (req, res) => {
    const { start, end } = req.query;
    const visits = db.prepare('SELECT * FROM visits WHERE date BETWEEN ? AND ?').all(start, end);
    res.json(visits);
  });

  app.post('/api/visits', (req, res) => {
    const { patientId, date, createdAt, type, weight, temperature, symptoms, diagnosis, prescriptionId, followUpForVisitId, price } = req.body;
    const result = db.prepare(`
      INSERT INTO visits (patientId, date, createdAt, type, weight, temperature, symptoms, diagnosis, prescriptionId, followUpForVisitId, price)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(patientId, date, createdAt, type, weight, temperature, symptoms, diagnosis, prescriptionId, followUpForVisitId, price);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/visits/:id', (req, res) => {
    const updates = req.body;
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE visits SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
    res.json({ success: true });
  });

  // Medicines
  app.get('/api/medicines', (req, res) => {
    const medicines = db.prepare('SELECT * FROM medicines').all().map((m: any) => ({
      ...m,
      dosages: JSON.parse(m.dosages)
    }));
    res.json(medicines);
  });

  app.post('/api/medicines', (req, res) => {
    const { name, form, dosages, notes } = req.body;
    const result = db.prepare('INSERT INTO medicines (name, form, dosages, notes) VALUES (?, ?, ?, ?)').run(name, form, JSON.stringify(dosages), notes);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/medicines/:id', (req, res) => {
    const { name, form, dosages, notes } = req.body;
    db.prepare('UPDATE medicines SET name = ?, form = ?, dosages = ?, notes = ? WHERE id = ?').run(name, form, JSON.stringify(dosages), notes, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/medicines/:id', (req, res) => {
    db.prepare('DELETE FROM medicines WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Prescriptions
  app.get('/api/prescriptions', (req, res) => {
    const prescriptions = db.prepare('SELECT * FROM prescriptions ORDER BY date DESC').all().map((p: any) => ({
      ...p,
      items: JSON.parse(p.items)
    }));
    res.json(prescriptions);
  });

  app.get('/api/prescriptions/:id', (req, res) => {
    const p = db.prepare('SELECT * FROM prescriptions WHERE id = ?').get(req.params.id) as any;
    if (p) p.items = JSON.parse(p.items);
    res.json(p);
  });

  app.post('/api/prescriptions', (req, res) => {
    const { visitId, patientId, items, doctorNotes, date, requiredTests, requiredScans, followUpDate, symptoms } = req.body;
    const result = db.prepare(`
      INSERT INTO prescriptions (visitId, patientId, items, doctorNotes, date, requiredTests, requiredScans, followUpDate, symptoms)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(visitId, patientId, JSON.stringify(items), doctorNotes, date, requiredTests, requiredScans, followUpDate, symptoms);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/prescriptions/:id', (req, res) => {
    const updates = req.body;
    if (updates.items) updates.items = JSON.stringify(updates.items);
    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE prescriptions SET ${setClause} WHERE id = ?`).run(...values, req.params.id);
    res.json({ success: true });
  });

  // Prescription Templates
  app.get('/api/templates', (req, res) => {
    const templates = db.prepare('SELECT * FROM prescriptionTemplates').all().map((t: any) => ({
      ...t,
      items: JSON.parse(t.items)
    }));
    res.json(templates);
  });

  app.post('/api/templates', (req, res) => {
    const { name, items, diagnosis, doctorNotes } = req.body;
    const result = db.prepare('INSERT INTO prescriptionTemplates (name, items, diagnosis, doctorNotes) VALUES (?, ?, ?, ?)').run(name, JSON.stringify(items), diagnosis, doctorNotes);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/templates/:id', (req, res) => {
    const { name, items, diagnosis, doctorNotes } = req.body;
    db.prepare('UPDATE prescriptionTemplates SET name = ?, items = ?, diagnosis = ?, doctorNotes = ? WHERE id = ?').run(name, JSON.stringify(items), diagnosis, doctorNotes, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/templates/:id', (req, res) => {
    db.prepare('DELETE FROM prescriptionTemplates WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Expenses
  app.get('/api/expenses', (req, res) => {
    try {
        const expenses = db.prepare('SELECT * FROM expenses').all();
        res.json(expenses);
    } catch (error) {
        res.status(500).json({ error: (error as Error).message });
    }
});

app.get('/api/expenses/month', (req, res) => {
    const { start, end } = req.query;
    const expenses = db.prepare('SELECT * FROM expenses WHERE date BETWEEN ? AND ? ORDER BY date DESC').all(start, end);
    res.json(expenses);
  });

  app.post('/api/expenses', (req, res) => {
    const { date, category, description, amount } = req.body;
    const result = db.prepare('INSERT INTO expenses (date, category, description, amount) VALUES (?, ?, ?, ?)').run(date, category, description, amount);
    res.json({ id: result.lastInsertRowid });
  });

  app.put('/api/expenses/:id', (req, res) => {
    const { date, category, description, amount } = req.body;
    db.prepare('UPDATE expenses SET date = ?, category = ?, description = ?, amount = ? WHERE id = ?').run(date, category, description, amount, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/expenses/:id', (req, res) => {
    db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Waiting List
  app.get('/api/waiting-list', (req, res) => {
    const list = db.prepare('SELECT * FROM waitingList ORDER BY isEmergency DESC, addedAt ASC').all();
    // Convert isEmergency from 0/1 to boolean
    const formattedList = list.map((item: any) => ({
      ...item,
      isEmergency: !!item.isEmergency
    }));
    res.json(formattedList);
  });

  app.post('/api/waiting-list', (req, res) => {
    const { patientId, patientName, patientFileNumber, isEmergency } = req.body;
    const addedAt = Date.now();
    const result = db.prepare('INSERT INTO waitingList (patientId, patientName, patientFileNumber, addedAt, isEmergency) VALUES (?, ?, ?, ?, ?)').run(patientId, patientName, patientFileNumber, addedAt, isEmergency ? 1 : 0);
    res.json({ id: result.lastInsertRowid, addedAt });
  });

  app.put('/api/waiting-list/:id/emergency', (req, res) => {
    const { isEmergency } = req.body;
    db.prepare('UPDATE waitingList SET isEmergency = ? WHERE id = ?').run(isEmergency ? 1 : 0, req.params.id);
    res.json({ success: true });
  });

  app.delete('/api/waiting-list/:id', (req, res) => {
    db.prepare('DELETE FROM waitingList WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Symptoms
  app.get('/api/symptoms', (req, res) => {
    const symptoms = db.prepare('SELECT * FROM symptoms').all();
    res.json(symptoms);
  });

  app.post('/api/symptoms', (req, res) => {
    const { name } = req.body;
    try {
      const result = db.prepare('INSERT INTO symptoms (name) VALUES (?)').run(name);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: 'Symptom already exists' });
    }
  });

  app.delete('/api/symptoms/:id', (req, res) => {
    db.prepare('DELETE FROM symptoms WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Diagnoses
  app.get('/api/diagnoses', (req, res) => {
    const diagnoses = db.prepare('SELECT * FROM diagnoses').all();
    res.json(diagnoses);
  });

  app.post('/api/diagnoses', (req, res) => {
    const { name } = req.body;
    try {
      const result = db.prepare('INSERT INTO diagnoses (name) VALUES (?)').run(name);
      res.json({ id: result.lastInsertRowid });
    } catch (e) {
      res.status(400).json({ error: 'Diagnosis already exists' });
    }
  });

  app.delete('/api/diagnoses/:id', (req, res) => {
    db.prepare('DELETE FROM diagnoses WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  // Settings
  app.get('/api/settings/:key', (req, res) => {
    const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get(req.params.key) as { value: string } | undefined;
    res.json(setting ? JSON.parse(setting.value) : null);
  });

  app.post('/api/settings/:key', (req, res) => {
    const { value } = req.body;
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(req.params.key, JSON.stringify(value));
    res.json({ success: true });
  });

  // Users
  app.get('/api/users', (req, res) => {
    const users = db.prepare('SELECT id, username, role FROM users').all();
    res.json(users);
  });

  app.post('/api/users', (req, res) => {
    const { username, password, role } = req.body;
    const result = db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, role);
    res.json({ id: result.lastInsertRowid, username, role });
  });

  app.put('/api/users/:id', (req, res) => {
    const { username, password, role } = req.body;
    if (password) {
      db.prepare('UPDATE users SET username = ?, password = ?, role = ? WHERE id = ?').run(username, password, role, req.params.id);
    } else {
      db.prepare('UPDATE users SET username = ?, role = ? WHERE id = ?').run(username, role, req.params.id);
    }
    res.json({ success: true });
  });

  app.delete('/api/users/:id', (req, res) => {
    db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
    res.json({ success: true });
  });

  app.get('/api/server-info', (req, res) => {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];
    for (const k in interfaces) {
      const iface = interfaces[k];
      if (iface) {
        for (const address of iface) {
          if (address.family === 'IPv4' && !address.internal) {
            addresses.push(address.address);
          }
        }
      }
    }
    res.json({ 
      addresses,
      port: PORT,
      platform: process.platform,
      nodeVersion: process.version
    });
  });

  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare('SELECT id, username, role FROM users WHERE username = ? AND password = ?').get(username, password) as any;
    if (user) {
      res.json(user);
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  });

  // Backup and Restore
  app.get('/api/backup/export', (req, res) => {
    const data = {
      patients: db.prepare('SELECT * FROM patients').all(),
      visits: db.prepare('SELECT * FROM visits').all(),
      medicines: db.prepare('SELECT * FROM medicines').all().map((m: any) => ({ ...m, dosages: JSON.parse(m.dosages) })),
      prescriptions: db.prepare('SELECT * FROM prescriptions').all().map((p: any) => ({ ...p, items: JSON.parse(p.items) })),
      prescriptionTemplates: db.prepare('SELECT * FROM prescriptionTemplates').all().map((t: any) => ({ ...t, items: JSON.parse(t.items) })),
      expenses: db.prepare('SELECT * FROM expenses').all(),
      symptoms: db.prepare('SELECT * FROM symptoms').all(),
      diagnoses: db.prepare('SELECT * FROM diagnoses').all(),
      settings: db.prepare('SELECT * FROM settings').all().reduce((acc: any, s: any) => {
        acc[s.key] = JSON.parse(s.value);
        return acc;
      }, {}),
      users: db.prepare('SELECT * FROM users').all(),
    };
    res.json(data);
  });

  app.post('/api/backup/import', (req, res) => {
    const data = req.body;
    const transaction = db.transaction(() => {
      // Clear existing data
      db.prepare('DELETE FROM waitingList').run();
      db.prepare('DELETE FROM prescriptions').run();
      db.prepare('DELETE FROM visits').run();
      db.prepare('DELETE FROM patients').run();
      db.prepare('DELETE FROM medicines').run();
      db.prepare('DELETE FROM prescriptionTemplates').run();
      db.prepare('DELETE FROM expenses').run();
      db.prepare('DELETE FROM symptoms').run();
      db.prepare('DELETE FROM diagnoses').run();
      db.prepare('DELETE FROM settings').run();
      db.prepare('DELETE FROM users').run();

      // Import data
      if (data.patients) {
        const insert = db.prepare('INSERT INTO patients (id, fileNumber, name, birthDate, gender, chronicComplaints, diseaseHistory, city, doctorNotes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const p of data.patients) insert.run(p.id, p.fileNumber, p.name, p.birthDate, p.gender, p.chronicComplaints, p.diseaseHistory, p.city, p.doctorNotes);
      }
      if (data.medicines) {
        const insert = db.prepare('INSERT INTO medicines (id, name, form, dosages, notes) VALUES (?, ?, ?, ?, ?)');
        for (const m of data.medicines) insert.run(m.id, m.name, m.form, JSON.stringify(m.dosages), m.notes);
      }
      if (data.visits) {
        const insert = db.prepare('INSERT INTO visits (id, patientId, date, createdAt, type, weight, temperature, symptoms, diagnosis, prescriptionId, followUpForVisitId, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const v of data.visits) insert.run(v.id, v.patientId, v.date, v.createdAt, v.type, v.weight, v.temperature, v.symptoms, v.diagnosis, v.prescriptionId, v.followUpForVisitId, v.price);
      }
      if (data.prescriptions) {
        const insert = db.prepare('INSERT INTO prescriptions (id, visitId, patientId, items, doctorNotes, date, requiredTests, requiredScans, followUpDate, symptoms) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
        for (const p of data.prescriptions) insert.run(p.id, p.visitId, p.patientId, JSON.stringify(p.items), p.doctorNotes, p.date, p.requiredTests, p.requiredScans, p.followUpDate, p.symptoms);
      }
      if (data.prescriptionTemplates) {
        const insert = db.prepare('INSERT INTO prescriptionTemplates (id, name, items, diagnosis, doctorNotes) VALUES (?, ?, ?, ?, ?)');
        for (const t of data.prescriptionTemplates) insert.run(t.id, t.name, JSON.stringify(t.items), t.diagnosis, t.doctorNotes);
      }
      if (data.expenses) {
        const insert = db.prepare('INSERT INTO expenses (id, date, category, description, amount) VALUES (?, ?, ?, ?, ?)');
        for (const e of data.expenses) insert.run(e.id, e.date, e.category, e.description, e.amount);
      }
      if (data.symptoms) {
        const insert = db.prepare('INSERT INTO symptoms (id, name) VALUES (?, ?)');
        for (const s of data.symptoms) insert.run(s.id, s.name);
      }
      if (data.diagnoses) {
        const insert = db.prepare('INSERT INTO diagnoses (id, name) VALUES (?, ?)');
        for (const d of data.diagnoses) insert.run(d.id, d.name);
      }
      if (data.settings) {
        const insert = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
        for (const key in data.settings) insert.run(key, JSON.stringify(data.settings[key]));
      }
      if (data.users) {
        const insert = db.prepare('INSERT INTO users (id, username, password, role) VALUES (?, ?, ?, ?)');
        for (const u of data.users) insert.run(u.id, u.username, u.password, u.role);
      }
    });
    
    try {
      transaction();
      res.json({ success: true });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
