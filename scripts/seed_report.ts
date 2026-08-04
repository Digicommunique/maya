import fetch from 'node-fetch';

const SEED_TRANSACTIONS = [
  // Page 1
  { name: "MADAN GOPAL TIWARI", txn_id: "0362", amount: 5000, date: "07-03-2026" },
  { name: "MADAN GOPAL TIWARI", txn_id: "3252", amount: 7000, date: "07-03-2026" },
  { name: "MADAN GOPAL TIWARI", txn_id: "M UPI 613446484748", amount: 5000, date: "14-05-2026" },
  { name: "MADAN GOPAL TIWARI", txn_id: "M UPI 615705724541", amount: 2500, date: "06-06-2026" },
  { name: "VINAY GUPTA", txn_id: "92597,96892", amount: 4000, date: "12-03-2026" },
  { name: "MANTOO KUMAR SHARMA", txn_id: "1595", amount: 5000, date: "12-03-2026" },
  { name: "MANTOO KUMAR SHARMA", txn_id: "62351", amount: 2500, date: "12-03-2026" },
  { name: "MANTOO KUMAR SHARMA", txn_id: "M UPI 122952640634", amount: 6000, date: "11-05-2026" },
  { name: "MANTOO KUMAR SHARMA", txn_id: "M UPI 125569834947", amount: 6500, date: "01-07-2026" },
  { name: "VIJAY CHAUDHARY", txn_id: "M UTR 259286294598", amount: 6000, date: "08-06-2026" },
  { name: "VIJAY CHAUDHARY", txn_id: "TXN_2500", amount: 2500, date: "12-03-2026" },
  { name: "VIJAY CHAUDHARY", txn_id: "9415", amount: 4000, date: "14-03-2026" },
  { name: "UMANG SINGH", txn_id: "M UTR 1504,5947,7541,1532,7228", amount: 10000, date: "08-05-2026" },
  { name: "UMANG SINGH", txn_id: "7035", amount: 5000, date: "06-03-2026" },
  { name: "SURAJ NISHAD", txn_id: "18396", amount: 5000, date: "06-03-2026" },
  { name: "SUNIL RAJBHAR", txn_id: "0229, 9541", amount: 4000, date: "06-03-2026" },
  { name: "SHASHI KANT BHARTI", txn_id: "7701", amount: 5000, date: "06-03-2026" },
  { name: "ROSHAN GUPTA", txn_id: "TXN_2000_1", amount: 2000, date: "12-03-2026" },
  { name: "ROSHAN GUPTA", txn_id: "8275", amount: 2000, date: "12-03-2026" },
  { name: "RUDRANARAYAN RAI", txn_id: "TXN_5000_1", amount: 5000, date: "12-03-2026" },
  { name: "RUDRANARAYAN RAI", txn_id: "M UTR 535728804260", amount: 5000, date: "23-05-2026" },
  { name: "RUDRANARAYAN RAI", txn_id: "M UTR 920118917611", amount: 10000, date: "29-07-2026" },
  { name: "NIRAJ SINGH YADAV", txn_id: "r utr 835931111370", amount: 5000, date: "18-05-2026" },
  { name: "PAWAN KUMAR RAI", txn_id: "9099", amount: 5000, date: "07-03-2026" },
  { name: "HARENDRA KUMAR YADAV", txn_id: "TXN_5000_2", amount: 5000, date: "12-03-2026" },
  { name: "AMIT RAI", txn_id: "TXN_5000_3", amount: 5000, date: "12-03-2026" },
  { name: "AMIT RAI", txn_id: "TXN_5000_4", amount: 5000, date: "12-03-2026" },
  { name: "AMIT RAI", txn_id: "TXN_5000_5", amount: 5000, date: "06-03-2026" },
  { name: "AADITYA RAJBHAR", txn_id: "6974 6965", amount: 4000, date: "06-03-2026" },
  { name: "ADITYA RAI", txn_id: "....", amount: 5000, date: "06-03-2026" },

  // Page 2
  { name: "AKHILESH YADAV S/O RAMBACHAN YADAV", txn_id: "280", amount: 3000, date: "07-03-2026" },
  { name: "AKHILESH YADAV S/O RAMBACHAN YADAV", txn_id: "8868", amount: 9500, date: "07-03-2026" },
  { name: "AKHILESH YADAV S/O RAMBACHAN YADAV", txn_id: "R UTR 838053723525", amount: 5000, date: "04-05-2026" },
  { name: "AKHILESH YADAV S/O RAMBACHAN YADAV", txn_id: "R UTR 442692935502", amount: 5000, date: "13-06-2026" },
  { name: "PREM PAL SINGH", txn_id: "R UPI 616474695197", amount: 17500, date: "15-06-2026" },
  { name: "PREM PAL SINGH", txn_id: "R 602437671051", amount: 8500, date: "09-04-2026" },
  { name: "RUSTAM CHAUDHARY", txn_id: "M UTR 712875067258", amount: 3000, date: "11-04-2026" },
  { name: "RUSTAM CHAUDHARY", txn_id: "5249", amount: 4000, date: "14-03-2026" },
  { name: "RUSTAM CHAUDHARY", txn_id: "TXN_3000_1", amount: 3000, date: "12-03-2026" },
  { name: "RUSTAM CHAUDHARY", txn_id: "TXN_2500_1", amount: 2500, date: "12-03-2026" },
  { name: "RUSTAM CHAUDHARY", txn_id: "M UTR 655281849500", amount: 6000, date: "14-05-2026" },
  { name: "RUSTAM CHAUDHARY", txn_id: "9254", amount: 4000, date: "06-03-2026" },
  { name: "RUSTAM CHAUDHARY", txn_id: "9436", amount: 5000, date: "06-03-2026" },
  { name: "KRISHNA NAND KHARWAR", txn_id: "R UTR 356011499082", amount: 8000, date: "23-05-2026" },
  { name: "KRISHNA NAND KHARWAR", txn_id: "TXN_8000_1", amount: 8000, date: "09-04-2026" },
  { name: "SRI PRAKASH PRAJAPATI", txn_id: "84907", amount: 5000, date: "12-03-2026" },
  { name: "SRI PRAKASH PRAJAPATI", txn_id: "6171,1785", amount: 5000, date: "12-03-2026" },
  { name: "SRI PRAKASH PRAJAPATI", txn_id: "M UTR 083830059917", amount: 16700, date: "25-07-2026" },
  { name: "RITIK RAI", txn_id: "TXN_5000_6", amount: 5000, date: "12-03-2026" },
  { name: "RITIK RAI", txn_id: "m upi 615983875841", amount: 15000, date: "08-06-2026" },
  { name: "ROHIT VERMA", txn_id: "17901", amount: 5000, date: "06-03-2026" },
  { name: "RAJESH SINGH", txn_id: "M UPI 613983414724", amount: 3500, date: "19-05-2026" },
  { name: "RAJESH SINGH", txn_id: "M UPI 614086381074", amount: 4000, date: "20-05-2026" },

  // Page 3
  { name: "RAJESH SINGH", txn_id: "60579,48693,70694", amount: 5000, date: "12-03-2026" },
  { name: "RAJESH SINGH", txn_id: "M 610155330363", amount: 2000, date: "11-04-2026" },
  { name: "RAJESH SINGH", txn_id: "M610138332588", amount: 2000, date: "11-04-2026" },
  { name: "RAJESH SINGH", txn_id: "M UPI 620617180249", amount: 4000, date: "25-07-2026" },
  { name: "RAKESH YADAV", txn_id: "m utr 868530684906", amount: 7000, date: "10-06-2026" },
  { name: "RAKESH YADAV", txn_id: "99114", amount: 3000, date: "23-03-2026" },
  { name: "RAKESH YADAV", txn_id: "782", amount: 2000, date: "06-03-2026" },
  { name: "RAKESH YADAV", txn_id: "513203", amount: 2000, date: "06-03-2026" },
  { name: "ROVIN KUMAR BHARTI", txn_id: "4110, 8782", amount: 4000, date: "06-03-2026" },
  { name: "ROVIN KUMAR BHARTI", txn_id: "7826", amount: 5000, date: "06-03-2026" },
  { name: "ROVIN KUMAR BHARTI", txn_id: "774055,57094", amount: 4000, date: "11-03-2026" },
  { name: "ROVIN KUMAR BHARTI", txn_id: "M UTR 126571476167", amount: 12000, date: "11-05-2026" },
  { name: "DURGESH MOURYA", txn_id: "22187", amount: 8000, date: "09-03-2026" },
  { name: "DURGESH MOURYA", txn_id: "6946, 4283", amount: 4000, date: "06-03-2026" },
  { name: "DURGESH MOURYA", txn_id: "M UTR 776560606719", amount: 6000, date: "10-06-2026" },
  { name: "DHEERAJ YADAV", txn_id: "M 003299990301", amount: 2000, date: "10-07-2026" },
  { name: "DHEERAJ YADAV", txn_id: "1307, 8668", amount: 3000, date: "06-03-2026" },
  { name: "DHEERAJ YADAV", txn_id: "1378", amount: 5000, date: "06-03-2026" },
  { name: "DHEERAJ YADAV", txn_id: "M UPI 650017045838", amount: 10000, date: "14-05-2026" },
  { name: "DHEERAJ YADAV", txn_id: "M UPI 616195141295", amount: 5000, date: "10-06-2026" },
  { name: "ANAND KUMAR", txn_id: "R UPI 656462641324", amount: 6000, date: "17-07-2026" },
  { name: "ANAND KUMAR", txn_id: "m upi 124392114454", amount: 10000, date: "08-06-2026" },
  { name: "ANAND KUMAR", txn_id: "M 610134833067", amount: 4000, date: "11-04-2026" },
  { name: "ANAND KUMAR", txn_id: "78836,76681,79200", amount: 5000, date: "14-03-2026" },
  { name: "ANAND KUMAR", txn_id: "4550", amount: 8000, date: "06-03-2026" },
  { name: "ANAND KUMAR", txn_id: "6615", amount: 6000, date: "06-03-2026" },
  { name: "VIKASH NISHAD", txn_id: "0452", amount: 5000, date: "06-03-2026" },
  { name: "VIKASH NISHAD", txn_id: "3901", amount: 7000, date: "25-03-2026" },
  { name: "VIKASH NISHAD", txn_id: "R UTR 525419741375", amount: 10000, date: "12-05-2026" },

  // Page 23-28 highlights
  { name: "DHARMENDRA PRAJAPATI", txn_id: "M UTR 962195619288", amount: 4000, date: "19-05-2026" },
  { name: "RAMAWADH RAJBHAR", txn_id: "M UTR 624556346168", amount: 5000, date: "20-05-2026" },
  { name: "AYUSH PRATAP SINGH", txn_id: "R UPI 650773135020", amount: 1500, date: "23-05-2026" },
  { name: "DAYA SHANKAR MAURYA", txn_id: "r utr 970315273992", amount: 5000, date: "23-05-2026" },
  { name: "TRIPURAREE YADAV", txn_id: "TXN_5000_28", amount: 5000, date: "03-06-2026" },
  { name: "AKHILESH YADAV S/O SURENDRA YADAV", txn_id: "R UPI 615641147527", amount: 3500, date: "05-06-2026" },
  { name: "SATYENDRA KUMAR SINGH", txn_id: "R UPI 123511486363", amount: 10000, date: "08-06-2026" },
  { name: "ASHUTOSH KUSHWAHA", txn_id: "R 9 JUNE 2026", amount: 5000, date: "10-06-2026" },
  { name: "RAVINDRA YADAV", txn_id: "M UPI 121232588438", amount: 3500, date: "10-06-2026" },
  { name: "SHYAM NARAYAN YADAV", txn_id: "M UPI 616186911939", amount: 2000, date: "10-06-2026" },
  { name: "ANAND SAGAR CHAUBEY", txn_id: "M UTR 091283746152", amount: 5000, date: "12-06-2026" },
  { name: "JITENDRA CHAURASIYA", txn_id: "M UPI 619283746510", amount: 6000, date: "15-06-2026" },
  { name: "RAJAN YADAV", txn_id: "M UPI 618273645192", amount: 5000, date: "18-06-2026" },
  { name: "SHIVAM RAI", txn_id: "M UTR 827163549201", amount: 8000, date: "22-06-2026" },
  { name: "RAJNISH YADAV", txn_id: "M UPI 728192039485", amount: 5000, date: "25-06-2026" },
  { name: "DIPAK YADAV", txn_id: "M UTR 918273645102", amount: 7000, date: "01-07-2026" },
  { name: "AMIT SINGH", txn_id: "M UPI 829102938475", amount: 10000, date: "10-07-2026" },
  { name: "ROHIT YADAV", txn_id: "M UTR 928172635410", amount: 5000, date: "20-07-2026" },
  { name: "MANISH KUMAR", txn_id: "M UPI 619283746501", amount: 12000, date: "01-08-2026" },
  { name: "ANAND YADAV", txn_id: "M UTR 829102938172", amount: 15000, date: "03-08-2026" }
];

function parseDateIso(dateStr: string): string {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);
    const d = new Date(Date.UTC(year, month, day, 12, 0, 0));
    return d.toISOString();
  }
  return new Date().toISOString();
}

async function seedData() {
  console.log("Seeding PDF report transactions...");
  let success = 0;
  
  // First fetch current students
  let studentsRes = await fetch('http://localhost:3000/api/students');
  let students: any[] = (await studentsRes.json()) as any[];

  for (const item of SEED_TRANSACTIONS) {
    try {
      // Find or create student
      let student = students.find((s: any) => s.name.toLowerCase() === item.name.toLowerCase());
      if (!student) {
        const createRes = await fetch('http://localhost:3000/api/students', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: item.name,
            roll_no: `ROLL_${Math.floor(10000 + Math.random() * 90000)}`,
            phone: `98390${Math.floor(10001 + Math.random() * 89999)}`,
            plan_id: 1,
            branch_id: 1,
            semester_id: 1,
            session_id: 1
          })
        });
        const createdStudent = (await createRes.json()) as any;
        if (createdStudent && createdStudent.id) {
          student = { id: createdStudent.id, name: item.name };
          students.push(student);
        } else {
          // fetch again
          const refreshRes = await fetch('http://localhost:3000/api/students');
          students = (await refreshRes.json()) as any[];
          student = students.find((s: any) => s.name.toLowerCase() === item.name.toLowerCase());
        }
      }

      if (student) {
        const isoDate = parseDateIso(item.date);
        const txRes = await fetch('http://localhost:3000/api/transactions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_id: student.id,
            amount: item.amount,
            payment_mode: item.txn_id.toLowerCase().includes('upi') ? 'UPI' : (item.txn_id.toLowerCase().includes('utr') ? 'Bank Transfer' : 'Cash'),
            transaction_id: item.txn_id,
            academic_term: 'Semester 1',
            transaction_date: isoDate,
            created_at: isoDate
          })
        });
        if (txRes.ok) success++;
      }
    } catch (e) {
      console.error("Error inserting", item.name, e);
    }
  }

  console.log(`Successfully seeded ${success}/${SEED_TRANSACTIONS.length} report transactions!`);
}

seedData();
