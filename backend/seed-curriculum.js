import crypto from "crypto";

const programs = [
  "Diploma in Hospitality Services and Technology",
  "Diploma in Tourism and Travel Services",
  "Diploma in Multimedia Arts and Design",
  "Diploma in Industrial Education (Major in Hotel and Restaurant Services)",
  "Diploma in Industrial Education (Major in Multimedia Arts and Design)",
];

const curriculum: Record<string, Record<string, Record<string, { code: string; title: string; units: number }[]>>> = {
  "Diploma in Hospitality Services and Technology": {
    "1st Year": {
      "1st Semester": [
        { code: "COM 101", title: "Purposive Communication", units: 3 },
        { code: "MATH 101", title: "Mathematics in the Modern World", units: 3 },
        { code: "HOS 101", title: "Introduction to Hospitality Industry", units: 3 },
        { code: "HOS 102", title: "Fundamentals of Food Service Operations", units: 3 },
        { code: "HOS 103", title: "Basic Housekeeping Procedures", units: 3 },
        { code: "CS 101", title: "Computer Fundamentals", units: 3 },
        { code: "PE 101", title: "Physical Fitness 1", units: 2 },
        { code: "NSTP 101", title: "National Service Training Program 1", units: 3 },
      ],
      "2nd Semester": [
        { code: "PSY 101", title: "Understanding the Self", units: 3 },
        { code: "HIST 101", title: "Readings in Philippine History", units: 3 },
        { code: "HOS 104", title: "Front Office Operations", units: 3 },
        { code: "HOS 105", title: "Food and Beverage Service", units: 3 },
        { code: "HOS 106", title: "Basic Culinary Arts", units: 3 },
        { code: "HOS 107", title: "Hospitality Computer Applications", units: 3 },
        { code: "PE 102", title: "Physical Fitness 2", units: 2 },
        { code: "NSTP 102", title: "National Service Training Program 2", units: 3 },
      ],
    },
    "2nd Year": {
      "1st Semester": [
        { code: "HOS 201", title: "Kitchen Operations", units: 3 },
        { code: "HOS 202", title: "Housekeeping Management", units: 3 },
        { code: "HOS 203", title: "Food Safety and Sanitation", units: 3 },
        { code: "HOS 204", title: "Event Planning Fundamentals", units: 3 },
        { code: "HOS 205", title: "Customer Service Excellence", units: 3 },
        { code: "ACC 101", title: "Hospitality Accounting", units: 3 },
        { code: "LANG 101", title: "Foreign Language for Hospitality I", units: 3 },
      ],
      "2nd Semester": [
        { code: "HOS 206", title: "Restaurant Operations", units: 3 },
        { code: "HOS 207", title: "Hotel Operations Management", units: 3 },
        { code: "HOS 208", title: "Bartending and Beverage Management", units: 3 },
        { code: "HOS 209", title: "Tourism Geography", units: 3 },
        { code: "MKT 101", title: "Hospitality Marketing", units: 3 },
        { code: "LANG 102", title: "Foreign Language for Hospitality II", units: 3 },
        { code: "ENT 101", title: "Entrepreneurship", units: 3 },
      ],
    },
    "3rd Year": {
      "1st Semester": [
        { code: "HOS 301", title: "Hospitality Human Resource Management", units: 3 },
        { code: "HOS 302", title: "Banquet and Catering Management", units: 3 },
        { code: "MKT 301", title: "Hospitality Sales and Marketing", units: 3 },
        { code: "HOS 303", title: "Property Management Systems", units: 3 },
        { code: "HOS 304", title: "Sustainable Hospitality", units: 3 },
        { code: "RES 101", title: "Research Methods", units: 3 },
      ],
      "2nd Semester": [
        { code: "FIN 101", title: "Hospitality Financial Management", units: 3 },
        { code: "HOS 305", title: "Resort Operations", units: 3 },
        { code: "HOS 306", title: "Hospitality Laws and Ethics", units: 3 },
        { code: "HOS 307", title: "Leadership and Supervision", units: 3 },
        { code: "HOS 308", title: "Events Management", units: 3 },
        { code: "FEAS 101", title: "Feasibility Study", units: 3 },
      ],
    },
    "4th Year": {
      "1st Semester": [
        { code: "HOS 401", title: "Strategic Hospitality Management", units: 3 },
        { code: "HOS 402", title: "Hospitality Innovation and Technology", units: 3 },
        { code: "HOS 403", title: "Quality Assurance in Hospitality", units: 3 },
        { code: "OJT 401", title: "Internship/OJT (300-600 Hours)", units: 6 },
      ],
      "2nd Semester": [
        { code: "CAP 401", title: "Capstone Project", units: 3 },
        { code: "OJT 402", title: "Internship II", units: 3 },
        { code: "SEMINAR 401", title: "Seminar in Hospitality Trends", units: 2 },
        { code: "CAREER 101", title: "Career Development", units: 2 },
      ],
    },
  },
  "Diploma in Tourism and Travel Services": {
    "1st Year": {
      "1st Semester": [
        { code: "COM 101", title: "Purposive Communication", units: 3 },
        { code: "MATH 101", title: "Mathematics in the Modern World", units: 3 },
        { code: "TOUR 101", title: "Introduction to Tourism", units: 3 },
        { code: "TOUR 102", title: "Tourism Geography", units: 3 },
        { code: "CS 101", title: "Computer Applications", units: 3 },
        { code: "PE 101", title: "Physical Fitness 1", units: 2 },
        { code: "NSTP 101", title: "National Service Training Program 1", units: 3 },
      ],
      "2nd Semester": [
        { code: "PSY 101", title: "Understanding the Self", units: 3 },
        { code: "HIST 101", title: "Philippine History", units: 3 },
        { code: "TOUR 103", title: "Tourism Principles", units: 3 },
        { code: "TOUR 104", title: "Customer Relations", units: 3 },
        { code: "TOUR 105", title: "Tour Guiding Fundamentals", units: 3 },
        { code: "PE 102", title: "Physical Fitness 2", units: 2 },
        { code: "NSTP 102", title: "National Service Training Program 2", units: 3 },
      ],
    },
    "2nd Year": {
      "1st Semester": [
        { code: "TOUR 201", title: "Airline Ticketing and Reservation Systems", units: 3 },
        { code: "TOUR 202", title: "Travel Agency Operations", units: 3 },
        { code: "TOUR 203", title: "Tour Packaging", units: 3 },
        { code: "TOUR 204", title: "Tourism Marketing", units: 3 },
        { code: "ECON 101", title: "Tourism Economics", units: 3 },
        { code: "LANG 101", title: "Foreign Language I", units: 3 },
      ],
      "2nd Semester": [
        { code: "TOUR 205", title: "Airport and Airline Operations", units: 3 },
        { code: "TOUR 206", title: "Sustainable Tourism", units: 3 },
        { code: "TOUR 207", title: "Tour Guiding Techniques", units: 3 },
        { code: "TOUR 208", title: "Event Tourism", units: 3 },
        { code: "ENT 101", title: "Entrepreneurship", units: 3 },
        { code: "LANG 102", title: "Foreign Language II", units: 3 },
      ],
    },
    "3rd Year": {
      "1st Semester": [
        { code: "TOUR 301", title: "International Tourism", units: 3 },
        { code: "TOUR 302", title: "Ecotourism Management", units: 3 },
        { code: "TOUR 303", title: "Cruise Operations", units: 3 },
        { code: "TOUR 304", title: "Hospitality and Tourism Laws", units: 3 },
        { code: "RES 101", title: "Tourism Research", units: 3 },
      ],
      "2nd Semester": [
        { code: "TOUR 305", title: "Destination Management", units: 3 },
        { code: "TOUR 306", title: "MICE (Meetings, Incentives, Conferences and Exhibitions)", units: 3 },
        { code: "TOUR 307", title: "Tourism Planning", units: 3 },
        { code: "STAT 101", title: "Tourism Statistics", units: 3 },
        { code: "FEAS 101", title: "Feasibility Study", units: 3 },
      ],
    },
    "4th Year": {
      "1st Semester": [
        { code: "TOUR 401", title: "Tourism Management Strategies", units: 3 },
        { code: "QM 101", title: "Quality Management", units: 3 },
        { code: "OJT 401", title: "Internship/OJT", units: 6 },
      ],
      "2nd Semester": [
        { code: "CAP 401", title: "Capstone Project", units: 3 },
        { code: "OJT 402", title: "Internship II", units: 3 },
        { code: "SEMINAR 401", title: "Tourism Seminar", units: 2 },
        { code: "CAREER 101", title: "Career Preparation", units: 2 },
      ],
    },
  },
  "Diploma in Multimedia Arts and Design": {
    "1st Year": {
      "1st Semester": [
        { code: "COM 101", title: "Purposive Communication", units: 3 },
        { code: "MDA 101", title: "Introduction to Multimedia Arts", units: 3 },
        { code: "DRAW 101", title: "Drawing Fundamentals", units: 3 },
        { code: "DES 101", title: "Design Principles", units: 3 },
        { code: "CS 101", title: "Computer Fundamentals", units: 3 },
        { code: "MDA 102", title: "Digital Imaging", units: 3 },
        { code: "PE 101", title: "Physical Fitness 1", units: 2 },
        { code: "NSTP 101", title: "National Service Training Program 1", units: 3 },
      ],
      "2nd Semester": [
        { code: "PSY 101", title: "Understanding the Self", units: 3 },
        { code: "ART 101", title: "Art Appreciation", units: 3 },
        { code: "DES 102", title: "Typography", units: 3 },
        { code: "DES 103", title: "Graphic Design", units: 3 },
        { code: "DES 104", title: "Color Theory", units: 3 },
        { code: "PE 102", title: "Physical Fitness 2", units: 2 },
        { code: "NSTP 102", title: "National Service Training Program 2", units: 3 },
      ],
    },
    "2nd Year": {
      "1st Semester": [
        { code: "MDA 201", title: "Adobe Photoshop", units: 3 },
        { code: "MDA 202", title: "Adobe Illustrator", units: 3 },
        { code: "MDA 203", title: "Photography", units: 3 },
        { code: "DES 201", title: "Branding and Identity Design", units: 3 },
        { code: "MDA 204", title: "Digital Illustration", units: 3 },
        { code: "WEB 101", title: "Web Design Fundamentals", units: 3 },
      ],
      "2nd Semester": [
        { code: "MDA 205", title: "Adobe InDesign", units: 3 },
        { code: "MDA 206", title: "Motion Graphics", units: 3 },
        { code: "MDA 207", title: "Video Editing", units: 3 },
        { code: "DES 202", title: "UI/UX Design", units: 3 },
        { code: "MDA 208", title: "Audio Production", units: 3 },
        { code: "ENT 101", title: "Entrepreneurship", units: 3 },
      ],
    },
    "3rd Year": {
      "1st Semester": [
        { code: "MDA 301", title: "Animation Principles", units: 3 },
        { code: "MDA 302", title: "2D Animation", units: 3 },
        { code: "MDA 303", title: "3D Modeling", units: 3 },
        { code: "MDA 304", title: "Visual Effects", units: 3 },
        { code: "MDA 305", title: "Storyboarding", units: 3 },
        { code: "RES 101", title: "Multimedia Research", units: 3 },
      ],
      "2nd Semester": [
        { code: "MDA 306", title: "3D Animation", units: 3 },
        { code: "MDA 307", title: "Game Art Fundamentals", units: 3 },
        { code: "WEB 201", title: "Web Development", units: 3 },
        { code: "PORT 101", title: "Portfolio Development", units: 3 },
        { code: "CAP 301", title: "Capstone Proposal", units: 3 },
      ],
    },
    "4th Year": {
      "1st Semester": [
        { code: "MDA 401", title: "Advanced Multimedia Production", units: 3 },
        { code: "MDA 402", title: "Creative Project Management", units: 3 },
        { code: "OJT 401", title: "Internship/OJT", units: 6 },
      ],
      "2nd Semester": [
        { code: "CAP 401", title: "Capstone Project", units: 3 },
        { code: "OJT 402", title: "Internship II", units: 3 },
        { code: "MDA 403", title: "Portfolio Exhibition", units: 2 },
        { code: "CAREER 101", title: "Career Development", units: 2 },
      ],
    },
  },
  "Diploma in Industrial Education (Major in Hotel and Restaurant Services)": {
    "1st Year": {
      "1st Semester": [
        { code: "COM 101", title: "Purposive Communication", units: 3 },
        { code: "MATH 101", title: "Mathematics in the Modern World", units: 3 },
        { code: "IND 101", title: "Introduction to Industrial Education", units: 3 },
        { code: "HOS 106", title: "Basic Cookery", units: 3 },
        { code: "CS 101", title: "Computer Fundamentals", units: 3 },
        { code: "PE 101", title: "Physical Fitness 1", units: 2 },
        { code: "NSTP 101", title: "National Service Training Program 1", units: 3 },
      ],
      "2nd Semester": [
        { code: "PSY 101", title: "Understanding the Self", units: 3 },
        { code: "HIST 101", title: "Philippine History", units: 3 },
        { code: "HOS 107", title: "Food Preparation", units: 3 },
        { code: "HOS 103", title: "Housekeeping", units: 3 },
        { code: "HOS 108", title: "Basic Baking", units: 3 },
        { code: "PE 102", title: "Physical Fitness 2", units: 2 },
        { code: "NSTP 102", title: "National Service Training Program 2", units: 3 },
      ],
    },
    "2nd Year": {
      "1st Semester": [
        { code: "HOS 209", title: "Commercial Cooking", units: 3 },
        { code: "HOS 210", title: "Restaurant Service", units: 3 },
        { code: "HOS 203", title: "Food Safety and HACCP", units: 3 },
        { code: "NUTR 101", title: "Nutrition", units: 3 },
        { code: "MATH 201", title: "Hospitality Mathematics", units: 3 },
        { code: "ENT 101", title: "Entrepreneurship", units: 3 },
      ],
      "2nd Semester": [
        { code: "HOS 211", title: "Front Office Operations", units: 3 },
        { code: "HOS 212", title: "Beverage Management", units: 3 },
        { code: "HOS 103", title: "Hotel Housekeeping", units: 3 },
        { code: "HOS 213", title: "Catering Services", units: 3 },
        { code: "MKT 101", title: "Hospitality Marketing", units: 3 },
        { code: "EDU 101", title: "Educational Technology", units: 3 },
      ],
    },
    "3rd Year": {
      "1st Semester": [
        { code: "HOS 214", title: "Hotel Operations", units: 3 },
        { code: "HOS 215", title: "Restaurant Management", units: 3 },
        { code: "EDU 201", title: "Teaching Strategies in Technical Education", units: 3 },
        { code: "EDU 202", title: "Assessment of Learning", units: 3 },
        { code: "RES 101", title: "Hospitality Research", units: 3 },
      ],
      "2nd Semester": [
        { code: "EDU 203", title: "Instructional Materials Development", units: 3 },
        { code: "HOS 216", title: "Hospitality Supervision", units: 3 },
        { code: "HRM 101", title: "Human Resource Management", units: 3 },
        { code: "FEAS 101", title: "Feasibility Study", units: 3 },
        { code: "EDU 204", title: "Practice Teaching I", units: 3 },
      ],
    },
    "4th Year": {
      "1st Semester": [
        { code: "EDU 205", title: "Practice Teaching II", units: 3 },
        { code: "OJT 401", title: "Internship/OJT", units: 6 },
        { code: "HOS 217", title: "Hospitality Leadership", units: 3 },
        { code: "IND 201", title: "School and Industry Partnership", units: 3 },
      ],
      "2nd Semester": [
        { code: "CAP 401", title: "Capstone Project", units: 3 },
        { code: "IND 202", title: "Industry Immersion", units: 3 },
        { code: "SEMINAR 201", title: "Seminar in Hospitality Education", units: 2 },
        { code: "CAREER 101", title: "Career Development", units: 2 },
      ],
    },
  },
  "Diploma in Industrial Education (Major in Multimedia Arts and Design)": {
    "1st Year": {
      "1st Semester": [
        { code: "COM 101", title: "Purposive Communication", units: 3 },
        { code: "IND 101", title: "Introduction to Industrial Education", units: 3 },
        { code: "DRAW 101", title: "Basic Drawing", units: 3 },
        { code: "CS 101", title: "Computer Fundamentals", units: 3 },
        { code: "DES 101", title: "Design Principles", units: 3 },
        { code: "PE 101", title: "Physical Fitness 1", units: 2 },
        { code: "NSTP 101", title: "National Service Training Program 1", units: 3 },
      ],
      "2nd Semester": [
        { code: "PSY 101", title: "Understanding the Self", units: 3 },
        { code: "ART 101", title: "Art Appreciation", units: 3 },
        { code: "DES 103", title: "Graphic Design Fundamentals", units: 3 },
        { code: "MDA 104", title: "Digital Illustration", units: 3 },
        { code: "PE 102", title: "Physical Fitness 2", units: 2 },
        { code: "NSTP 102", title: "National Service Training Program 2", units: 3 },
      ],
    },
    "2nd Year": {
      "1st Semester": [
        { code: "MDA 201", title: "Adobe Photoshop", units: 3 },
        { code: "MDA 202", title: "Adobe Illustrator", units: 3 },
        { code: "MDA 105", title: "Photography", units: 3 },
        { code: "DES 102", title: "Typography", units: 3 },
        { code: "EDU 101", title: "Educational Technology", units: 3 },
      ],
      "2nd Semester": [
        { code: "MDA 206", title: "Motion Graphics", units: 3 },
        { code: "MDA 207", title: "Video Production", units: 3 },
        { code: "DES 202", title: "UI/UX Design", units: 3 },
        { code: "MDA 106", title: "Animation Fundamentals", units: 3 },
        { code: "ENT 101", title: "Entrepreneurship", units: 3 },
      ],
    },
    "3rd Year": {
      "1st Semester": [
        { code: "MDA 303", title: "3D Modeling", units: 3 },
        { code: "MDA 304", title: "Visual Communication", units: 3 },
        { code: "MDA 305", title: "Multimedia Production", units: 3 },
        { code: "EDU 201", title: "Teaching Strategies", units: 3 },
        { code: "RES 101", title: "Multimedia Research", units: 3 },
      ],
      "2nd Semester": [
        { code: "EDU 202", title: "Instructional Design", units: 3 },
        { code: "WEB 201", title: "Web Development", units: 3 },
        { code: "PORT 101", title: "Portfolio Development", units: 3 },
        { code: "EDU 203", title: "Practice Teaching I", units: 3 },
        { code: "FEAS 101", title: "Feasibility Study", units: 3 },
      ],
    },
    "4th Year": {
      "1st Semester": [
        { code: "EDU 204", title: "Practice Teaching II", units: 3 },
        { code: "OJT 401", title: "Internship/OJT", units: 6 },
        { code: "MDA 205", title: "Multimedia Project Management", units: 3 },
        { code: "IND 203", title: "Industry Collaboration", units: 3 },
      ],
      "2nd Semester": [
        { code: "CAP 401", title: "Capstone Project", units: 3 },
        { code: "MDA 401", title: "Multimedia Portfolio Defense", units: 3 },
        { code: "SEMINAR 301", title: "Seminar in Digital Media", units: 2 },
        { code: "CAREER 101", title: "Career Development", units: 2 },
      ],
    },
  },
};

let sql = '';
programs.forEach((name, idx) => {
  const progId = crypto.randomUUID();
  const desc = '';
  const status = 'active';
  const createdAt = new Date().toISOString();
  sql += \`INSERT OR IGNORE INTO programs (id, name, description, status, createdAt) VALUES ('\${progId}', '\${name}', '\${desc}', '\${status}', '\${createdAt}');\\n\`;

  const years = curriculum[name];
  if (!years) return;
  Object.keys(years).forEach(year => {
    Object.keys(years[year]).forEach(sem => {
      years[year][sem].forEach(subj => {
        const id = crypto.randomUUID();
        sql += \`INSERT OR IGNORE INTO curriculum (id, programId, yearLevel, semester, subjectCode, subjectTitle, units) VALUES ('\${id}', '\${progId}', '\${year}', '\${sem}', '\${subj.code}', '\${subj.title}', \${subj.units});\\n\`;
      });
    });
  });
});

console.log(sql);
