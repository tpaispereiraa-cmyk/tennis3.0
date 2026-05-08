// ============================================
// NEWGENENGINE.JS - Sistema Completo de Geração Procedural de Jogadores
// ============================================
// 
// Sistema autônomo para criar novos jogadores (newgens) com:
// - Distribuição geográfica realista
// - Raridade de potencial balanceada
// - Atributos baseados em mentalidade
// - Nomes procedurais únicos
// - Estilos de desenvolvimento variados

import { 
  MENTALITY_STAT_PRIORITIES,
  determineAlcunha,
  DEV_CONSTANTS
} from './DevelopmentConstants.js';

import { calculateThresholds } from './ScoutSystem.js';

import {
  generateTraitDNA,
  generateInitialTraits,
  getTraitDNAProfile,
} from './TraitDNASystem.js';

import { assignImage } from './NewgenImageBank.js';

// ============================================
// 📊 BANCOS DE DADOS
// ============================================

const NAME_BANKS = {
  americas: {
    male: [
      // Brasil
      'Lucas', 'Gabriel', 'Rafael', 'Matheus', 'Gustavo', 'Felipe', 'Bruno', 'Thiago',
      'Rodrigo', 'Eduardo', 'Leonardo', 'Henrique', 'Vitor', 'Caio', 'Murilo', 'Davi',
      'Igor', 'Vinícius', 'Cauã', 'Bernardo', 'Samuel', 'Guilherme', 'Arthur', 'Enzo',
      // América Hispânica
      'Diego', 'Carlos', 'Miguel', 'Juan', 'Jose', 'Luis', 'Pedro', 'Antonio',
      'Fernando', 'Ricardo', 'Andres', 'Alejandro', 'Sebastián', 'Nicolás', 'Mateo',
      'Santiago', 'Emilio', 'Javier', 'Marcos', 'Roberto', 'Cristian', 'Ezequiel',
      // América do Norte
      'Marcus', 'Tyler', 'Jordan', 'Devon', 'Malik', 'Darius', 'Jaylen', 'Kamari',
      'Elijah', 'Isaiah', 'Caleb', 'Tristan', 'Dominic', 'Adrian', 'Xavier',
      'Zion', 'Kaiden', 'Bryce', 'Cole', 'Ryder', 'Luca', 'Marco', 'Dante',
    ],
    female: [
      // Brasil
      'Sofia', 'Isabella', 'Maria', 'Ana', 'Beatriz', 'Larissa', 'Fernanda', 'Juliana',
      'Camila', 'Valentina', 'Daniela', 'Andrea', 'Paula', 'Laura', 'Carolina', 'Yasmin',
      'Letícia', 'Bruna', 'Mariana', 'Natália', 'Jéssica', 'Vitória', 'Amanda', 'Rebeca',
      // América Hispânica
      'Lucia', 'Carmen', 'Rosa', 'Elena', 'Gabriela', 'Paola', 'Valeria', 'Catalina',
      'Renata', 'Alejandra', 'Xiomara', 'Isabela', 'Florencia', 'Rocio', 'Antonella',
      // América do Norte
      'Aaliyah', 'Jasmine', 'Destiny', 'Kayla', 'Brianna', 'Madison', 'Riley',
      'Zara', 'Naomi', 'Layla', 'Imani', 'Amara', 'Talia', 'Jade', 'Serena',
    ],
    lastNames: [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Ferreira', 'Costa', 'Pereira', 'Alves',
      'Rodrigues', 'Lima', 'Gomes', 'Carvalho', 'Ribeiro', 'Martins', 'Araújo',
      'Rodriguez', 'Martinez', 'Garcia', 'Lopez', 'Hernandez', 'Gonzalez', 'Perez',
      'Sanchez', 'Ramirez', 'Torres', 'Flores', 'Rivera', 'Gomez', 'Diaz', 'Cruz',
      'Morales', 'Reyes', 'Jimenez', 'Ruiz', 'Alvarez', 'Castillo', 'Ortiz',
      'Mendoza', 'Vargas', 'Castro', 'Romero', 'Soto', 'Contreras', 'Medina',
      'Herrera', 'Rojas', 'Vega', 'Guerrero', 'Acosta', 'Paredes', 'Fuentes',
      'Williams', 'Johnson', 'Brown', 'Jones', 'Davis', 'Wilson', 'Taylor',
      'Anderson', 'Harris', 'Jackson', 'White', 'Thompson', 'Martin', 'Robinson',
      'Walker', 'Young', 'Allen', 'King', 'Scott', 'Green', 'Baker', 'Nelson',
    ]
  },

  europe: {
    male: [
      // Inglês/Escocês
      'Liam', 'Noah', 'Oliver', 'Harry', 'George', 'Charlie', 'Archie', 'Freddie',
      'Theo', 'Alfie', 'Rory', 'Finn', 'Callum', 'Connor', 'Jamie', 'Ewan',
      // Alemão/Austríaco
      'Leon', 'Felix', 'Ben', 'Jonas', 'Luca', 'Milan', 'Anton', 'Moritz',
      'Lukas', 'Paul', 'Max', 'Jan', 'Fabian', 'Stefan', 'Tobias', 'Niklas',
      // Francês
      'Hugo', 'Louis', 'Arthur', 'Leo', 'Théo', 'Mathis', 'Nathan', 'Alexis',
      'Quentin', 'Maxime', 'Baptiste', 'Florian', 'Valentin', 'Romain', 'Antoine',
      // Italiano/Espanhol
      'Marco', 'Lorenzo', 'Matteo', 'Leonardo', 'Alessandro', 'Gabriele', 'Filippo',
      'Adrián', 'Pablo', 'Álvaro', 'Sergio', 'Rubén', 'Marcos', 'Víctor', 'Raúl',
      // Nórdico/Eslavo
      'Mikkel', 'Emil', 'Oskar', 'Viktor', 'Dmitri', 'Aleksei', 'Ivan', 'Nikolai',
      'Radek', 'Patrik', 'Tomas', 'Jakub', 'Marek', 'Luboš', 'Kristoffer',
    ],
    female: [
      // Inglês
      'Emma', 'Mia', 'Sophie', 'Charlotte', 'Isla', 'Poppy', 'Rosie', 'Grace',
      'Evie', 'Lily', 'Amelia', 'Olivia', 'Ellie', 'Freya', 'Harriet', 'Imogen',
      // Alemão/Austríaco
      'Hannah', 'Lea', 'Emilia', 'Lena', 'Sophia', 'Maja', 'Clara', 'Lara',
      'Mia', 'Nora', 'Jana', 'Alina', 'Amelie', 'Luisa', 'Katharina', 'Theresa',
      // Francês
      'Marie', 'Anna', 'Julia', 'Camille', 'Manon', 'Léa', 'Chloé', 'Inès',
      'Mathilde', 'Pauline', 'Sarah', 'Lucie', 'Claire', 'Océane', 'Juliette',
      // Italiano/Espanhol
      'Giulia', 'Martina', 'Sofia', 'Valentina', 'Chiara', 'Francesca', 'Elena',
      'Lucía', 'Marta', 'Nadia', 'Pilar', 'Cristina', 'Silvia', 'Raquel', 'Alba',
      // Nórdico/Eslavo
      'Astrid', 'Ingrid', 'Sigrid', 'Petra', 'Karolina', 'Veronika', 'Natasha',
      'Anya', 'Katya', 'Irina', 'Klara', 'Tereza', 'Monika', 'Annika', 'Heidi',
    ],
    lastNames: [
      // Inglês
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Miller', 'Davis', 'Wilson',
      'Taylor', 'Anderson', 'Thomas', 'Roberts', 'Walker', 'Robinson', 'Wright',
      'Thompson', 'White', 'Hall', 'Harris', 'Clarke', 'Lewis', 'Young', 'Allen',
      // Alemão
      'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner',
      'Becker', 'Hoffmann', 'Schulz', 'Koch', 'Richter', 'Klein', 'Wolf', 'Braun',
      // Francês
      'Bernard', 'Dubois', 'Thomas', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy',
      'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand',
      // Italiano
      'Rossi', 'Russo', 'Ferrari', 'Esposito', 'Bianchi', 'Romano', 'Colombo', 'Ricci',
      'Marino', 'Greco', 'Bruno', 'Gallo', 'Conti', 'De Luca', 'Costa', 'Giordano',
      // Espanhol
      'García', 'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Sánchez',
      'Pérez', 'Gómez', 'Martín', 'Jiménez', 'Ruiz', 'Hernández', 'Díaz', 'Moreno',
      // Nórdico/Eslavo
      'Hansen', 'Nielsen', 'Jensen', 'Olsen', 'Berg', 'Lindqvist', 'Eriksson',
      'Novak', 'Kowalski', 'Kowalczyk', 'Horvat', 'Svoboda', 'Dvorak', 'Blazek',
    ]
  },

  asia: {
    male: [
      // Japonês
      'Hiroshi', 'Kenji', 'Takeshi', 'Haruto', 'Yuto', 'Ren', 'Souta', 'Daiki',
      'Kaito', 'Ryota', 'Kento', 'Shota', 'Yuki', 'Akira', 'Naoki', 'Tatsuya',
      'Kazuma', 'Riku', 'Hayato', 'Yusei', 'Tsubasa', 'Ryuu', 'Issei', 'Makoto',
      // Coreano
      'Min-ho', 'Ji-hoon', 'Tae-yang', 'Seung-hyun', 'Junho', 'Joon', 'Hyun',
      'Woo-jin', 'Sang-woo', 'Do-hyun', 'Jae-won', 'Yoon-soo', 'Kyung-min', 'Soo-hyun',
      // Chinês
      'Wei', 'Ming', 'Feng', 'Jian', 'Bo', 'Cheng', 'Hao', 'Lei', 'Peng',
      'Qiang', 'Tao', 'Xin', 'Zhe', 'Zheng', 'Jiaming', 'Tianyu', 'Haoran',
      // Sul/Sudeste Asiático
      'Arjun', 'Rohan', 'Kiran', 'Raj', 'Vikram', 'Aditya', 'Siddharth', 'Kabir',
      'Akash', 'Ravi', 'Rahul', 'Nikhil', 'Pranav', 'Soren', 'Kai', 'Shin',
    ],
    female: [
      // Japonês
      'Sakura', 'Hana', 'Yui', 'Aoi', 'Hina', 'Mio', 'Riko', 'Yuna', 'Mei',
      'Sora', 'Rina', 'Nana', 'Kira', 'Ayane', 'Akane', 'Hinata', 'Natsuki',
      'Koharu', 'Misaki', 'Kurumi', 'Yuzuki', 'Asahi', 'Kirari', 'Momoka', 'Haruka',
      // Coreano
      'Soo-jin', 'Ji-yeon', 'Min-ji', 'Ye-jin', 'Soo-yeon', 'Eun-ji', 'Ha-eun',
      'Da-eun', 'Yoon-ji', 'Na-yeon', 'Su-yeon', 'Ji-hyun', 'Ha-rin', 'Seo-yun',
      // Chinês
      'Mei', 'Ling', 'Xiao', 'Yan', 'Fang', 'Li', 'Jing', 'Xue', 'Yue',
      'Qian', 'Rui', 'Shan', 'Ting', 'Xian', 'Xiaoyu', 'Yingying', 'Mengqi',
      // Sul/Sudeste Asiático
      'Priya', 'Ananya', 'Diya', 'Anika', 'Riya', 'Ishaan', 'Meera', 'Pooja',
      'Nisha', 'Kavya', 'Shreya', 'Divya', 'Tanvi', 'Aaradhya', 'Pari',
    ],
    lastNames: [
      // Japonês
      'Yamamoto', 'Tanaka', 'Suzuki', 'Watanabe', 'Ito', 'Nakamura', 'Kobayashi',
      'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Yamaguchi', 'Matsumoto', 'Inoue',
      'Kimura', 'Hayashi', 'Shimizu', 'Yamazaki', 'Mori', 'Abe', 'Ikeda', 'Hasegawa',
      // Coreano
      'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim',
      'Han', 'Oh', 'Seo', 'Kwon', 'Hwang', 'Shin', 'Moon', 'Baek', 'Song', 'Yang',
      // Chinês
      'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Huang', 'Zhao', 'Wu', 'Zhou',
      'Xu', 'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Lin', 'Luo', 'Xiao', 'Tang',
      // Sul/Sudeste Asiático
      'Nguyen', 'Tran', 'Le', 'Pham', 'Hoang', 'Patel', 'Singh', 'Kumar', 'Sharma',
      'Gupta', 'Verma', 'Mehta', 'Shah', 'Nair', 'Rao', 'Reddy', 'Mishra',
    ]
  },

  africa: {
    male: [
      // África Ocidental
      'Kwame', 'Kofi', 'Yaw', 'Kwaku', 'Kojo', 'Jabari', 'Malik', 'Tariq',
      'Rashid', 'Jamal', 'Kareem', 'Idris', 'Faraji', 'Emeka', 'Chidi', 'Ifeanyi',
      'Tunde', 'Seun', 'Femi', 'Wale', 'Dele', 'Bode', 'Tobi', 'Gbenga',
      // África do Sul/Oriental
      'Thabo', 'Sipho', 'Mandla', 'Themba', 'Bongani', 'Siyanda', 'Lwazi',
      'Njabulo', 'Mthokozisi', 'Sandile', 'Phiwayinkosi', 'Nhlanhla', 'Sibusiso',
      'Kamau', 'Njoroge', 'Mwangi', 'Otieno', 'Omondi', 'Muya', 'Juma', 'Baraka',
      // Norte da África/Sahel
      'Omar', 'Hassan', 'Ibrahim', 'Yusuf', 'Moussa', 'Oumar', 'Mamadou', 'Boubacar',
      'Seydou', 'Cheikh', 'Modou', 'Lamine', 'Tidiane', 'Issiaka', 'Souleymane',
    ],
    female: [
      // África Ocidental
      'Ama', 'Abena', 'Amara', 'Nia', 'Zuri', 'Imani', 'Ayana', 'Sanaa',
      'Amina', 'Zahara', 'Jamila', 'Adaeze', 'Chidinma', 'Ngozi', 'Nkechi',
      'Nneka', 'Chiamaka', 'Adaora', 'Ifeoma', 'Chioma', 'Yetunde', 'Folake',
      // África do Sul/Oriental
      'Lindiwe', 'Nokuthula', 'Nomvula', 'Thandiwe', 'Nompumelelo', 'Nosipho',
      'Zanele', 'Ntombi', 'Buhle', 'Khosi', 'Fikile', 'Nomsa', 'Duduzile',
      'Auma', 'Wanjiru', 'Zawadi', 'Amali', 'Asha', 'Furaha', 'Neema', 'Tumaini',
      // Norte da África
      'Aisha', 'Fatima', 'Safiya', 'Layla', 'Yasmin', 'Nadira', 'Aaliyah',
      'Mariam', 'Khadija', 'Zainab', 'Halima', 'Rokia', 'Oumou', 'Fatoumata',
    ],
    lastNames: [
      'Okonkwo', 'Adeyemi', 'Olayinka', 'Babatunde', 'Okafor', 'Nwosu', 'Eze', 'Chukwu',
      'Adebayo', 'Oladele', 'Oluwaseun', 'Adegbite', 'Akinola', 'Alabi', 'Balogun',
      'Musa', 'Ibrahim', 'Mohammed', 'Hassan', 'Ali', 'Ahmed', 'Omar', 'Yusuf',
      'Nkosi', 'Dlamini', 'Ndlovu', 'Khumalo', 'Mthembu', 'Moyo', 'Ncube', 'Sithole',
      'Zulu', 'Mkhize', 'Ntuli', 'Cele', 'Mthethwa', 'Gumede', 'Nxumalo', 'Shabalala',
      'Diop', 'Sow', 'Ba', 'Fall', 'Ndiaye', 'Sy', 'Cisse', 'Sarr', 'Gueye',
      'Mensah', 'Owusu', 'Agyeman', 'Asante', 'Abebe', 'Desta', 'Taye', 'Girma',
      'Kamau', 'Banda', 'Phiri', 'Mwangi', 'Otieno', 'Toure', 'Keita', 'Traore',
      'Coulibaly', 'Kouyate', 'Diallo', 'Bah', 'Camara', 'Soumah', 'Konaté',
    ]
  },

  oceania: {
    male: [
      // Australiano/Neozelandês
      'Jack', 'Oliver', 'William', 'Noah', 'Thomas', 'James', 'Henry', 'Liam',
      'Ethan', 'Mason', 'Cooper', 'Jackson', 'Logan', 'Harrison', 'Charlie', 'Max',
      'Archie', 'Hamish', 'Angus', 'Beau', 'Heath', 'Reef', 'Flynn', 'Cody',
      // Maori/Polinésio
      'Tane', 'Rangi', 'Wiremu', 'Pita', 'Hemi', 'Tipene', 'Ariki', 'Rawiri',
      'Maui', 'Rongo', 'Tama', 'Kahurangi', 'Ataahua', 'Hoani', 'Rāwiri',
    ],
    female: [
      // Australiano/Neozelandês
      'Mia', 'Charlotte', 'Amelia', 'Olivia', 'Ava', 'Emily', 'Isla', 'Grace',
      'Sophie', 'Ruby', 'Chloe', 'Zoe', 'Lily', 'Lucy', 'Hannah', 'Matilda',
      'Willow', 'Scarlett', 'Freya', 'Rosie', 'Billie', 'Indie', 'Harper', 'Aria',
      // Maori/Polinésio
      'Aroha', 'Mere', 'Hinemoa', 'Aotea', 'Hinerangi', 'Moana', 'Ngaio', 'Ripeka',
      'Kiri', 'Hana', 'Manaia', 'Tūhoe', 'Ioana', 'Hineaho', 'Mereana',
    ],
    lastNames: [
      'Williams', 'Brown', 'Wilson', 'Taylor', 'Anderson', 'Thomas', 'Roberts', 'Johnson',
      'White', 'Martin', 'Thompson', 'Walker', 'Robinson', 'Harris', 'King', 'Wright',
      'Lee', 'Hall', 'Allen', 'Young', 'Scott', 'Green', 'Adams', 'Baker', 'Nelson',
      'Mitchell', 'Campbell', 'Carter', 'Parker', 'Evans', 'Edwards', 'Collins',
      'Turner', 'Morris', 'Murray', 'Ferguson', 'MacDonald', 'Stewart', 'Ross',
      // Maori
      'Tūhoe', 'Ngata', 'Parata', 'Tūhoe', 'Ihaka', 'Reweti', 'Tāmati', 'Koroheke',
    ]
  }
};

const COUNTRIES_BY_REGION = {
  americas: [
    '🇧🇷 Brasil', '🇺🇸 EUA', '🇨🇦 Canadá', '🇲🇽 México', 
    '🇦🇷 Argentina', '🇨🇱 Chile', '🇨🇴 Colômbia', '🇵🇪 Peru',
    '🇻🇪 Venezuela', '🇪🇨 Equador', '🇺🇾 Uruguai', '🇵🇾 Paraguai'
  ],
  europe: [
    '🏴󐁧󐁢󐁥󐁮󐁧󐁿 Inglaterra', '🇫🇷 França', '🇩🇪 Alemanha', '🇮🇹 Itália', 
    '🇪🇸 Espanha', '🇷🇺 Rússia', '🇵🇱 Polônia', '🇳🇱 Holanda',
    '🇧🇪 Bélgica', '🇵🇹 Portugal', '🇸🇪 Suécia', '🇳🇴 Noruega',
    '🇩🇰 Dinamarca', '🇨🇿 República Tcheca', '🇦🇹 Áustria', '🇬🇷 Grécia'
  ],
  asia: [
    '🇯🇵 Japão', '🇰🇷 Coreia do Sul', '🇨🇳 China', '🇮🇳 Índia', 
    '🇹🇭 Tailândia', '🇻🇳 Vietnã', '🇵🇭 Filipinas', '🇮🇩 Indonésia',
    '🇲🇾 Malásia', '🇸🇬 Singapura', '🇹🇼 Taiwan', '🇭🇰 Hong Kong'
  ],
  africa: [
    '🇪🇬 Egito', '🇿🇦 África do Sul', '🇳🇬 Nigéria', '🇰🇪 Quênia', 
    '🇲🇦 Marrocos', '🇬🇭 Gana', '🇪🇹 Etiópia', '🇹🇿 Tanzânia',
    '🇺🇬 Uganda', '🇸🇳 Senegal', '🇨🇮 Costa do Marfim', '🇨🇲 Camarões'
  ],
  oceania: [
    '🇦🇺 Austrália', '🇳🇿 Nova Zelândia', '🇫🇯 Fiji', '🇵🇬 Papua Nova Guiné'
  ]
};

const NICKNAME_POOL = {
  // ── Usados para qualquer gênero (neutros, elementos, conceitos) ──
  neutral: [
    // Fenômenos naturais
    'Lightning', 'Thunder', 'Storm', 'Cyclone', 'Tempest', 'Blizzard', 'Hurricane',
    'Frost', 'Blaze', 'Inferno', 'Ember', 'Flash', 'Static', 'Gale', 'Torrent',
    'Monsoon', 'Hailstorm', 'Squall', 'Whirlwind', 'Wildfire', 'Dusk', 'Dawn',
    'Eclipse', 'Solstice', 'Equinox', 'Zenith', 'Apex', 'Vortex',
    // Celestiais
    'Nova', 'Comet', 'Meteor', 'Nebula', 'Pulsar', 'Quasar', 'Cosmos',
    'Stellar', 'Supernova', 'Abyss', 'Void', 'Horizon', 'Singularity',
    // Conceitos de batalha
    'Phantom', 'Ghost', 'Specter', 'Wraith', 'Shadow', 'Echo', 'Mirage',
    'Cipher', 'Zero', 'Null', 'Glitch', 'Static', 'Surge',
    'Pulse', 'Shock', 'Impact', 'Strike', 'Voltage', 'Current',
    // Velocidade/Movimento
    'Jet', 'Sonic', 'Turbo', 'Nitro', 'Boost', 'Blitz', 'Rush',
    'Drift', 'Surge', 'Streak', 'Dash', 'Sprint', 'Blur', 'Flux',
    // Metais/Materiais
    'Steel', 'Iron', 'Titanium', 'Carbon', 'Obsidian', 'Onyx', 'Jade',
    'Chrome', 'Cobalt', 'Tungsten', 'Platinum', 'Alloy', 'Ferro',
    // Mitologia (neutros)
    'Oracle', 'Titan', 'Atlas', 'Nemesis', 'Chaos', 'Aether', 'Void',
    'Rune', 'Omen', 'Fate', 'Wyrd', 'Karma', 'Cipher', 'Relic',
  ],

  // ── Masculinos ──
  male: [
    // Animais predadores
    'Viper', 'Cobra', 'Python', 'Mamba', 'Rattler', 'Sidewinder',
    'Hawk', 'Eagle', 'Falcon', 'Raptor', 'Osprey', 'Harrier',
    'Wolf', 'Wolfhound', 'Dire Wolf', 'Timberwolf', 'Alpha',
    'Lion', 'Tiger', 'Panther', 'Jaguar', 'Leopard', 'Cougar', 'Lynx',
    'Bear', 'Grizzly', 'Kodiak', 'Polar',
    'Dragon', 'Wyvern', 'Basilisk', 'Hydra', 'Griffin', 'Manticore',
    'Kraken', 'Leviathan', 'Behemoth',
    // Guerreiros/Títulos
    'Samurai', 'Ronin', 'Shogun', 'Daimyo', 'Kenshin',
    'Gladiator', 'Centurion', 'Legionnaire', 'Praetor', 'Consul',
    'Knight', 'Paladin', 'Crusader', 'Templar', 'Berserker',
    'Viking', 'Jarl', 'Warlord', 'Chieftain', 'Overlord',
    'Ninja', 'Shinobi', 'Assassin', 'Reaper', 'Slayer',
    // Poder/Força
    'Colossus', 'Goliath', 'Titan', 'Giant', 'Brute', 'Crusher', 'Breaker',
    'Destroyer', 'Demolisher', 'Annihilator', 'Obliterator', 'Decimator',
    'Punisher', 'Executioner', 'Terminator', 'Ravager', 'Predator',
    // Armas/Lâminas
    'Blade', 'Edge', 'Razor', 'Saber', 'Katana', 'Scythe', 'Cleaver',
    'Hatchet', 'Axe', 'Spear', 'Lance', 'Crossbow', 'Gunslinger',
    'Bullet', 'Buckshot', 'Cannon', 'Missile', 'Warhead',
    // Divindades masculinas
    'Zeus', 'Odin', 'Thor', 'Ares', 'Kratos', 'Loki', 'Poseidon',
    'Hades', 'Apollo', 'Osiris', 'Anubis', 'Ra', 'Set',
    'Indra', 'Shiva', 'Vishnu', 'Brahma',
    // Arquétipos
    'Ace', 'Rex', 'Kaiser', 'Czar', 'Duke', 'Baron', 'Earl',
    'King', 'Prince', 'Count', 'Lord', 'Sire', 'Majesty',
    'Sensei', 'Maestro', 'Sage', 'Oracle', 'Wizard',
    // Velocidade/Intensidade
    'Inferno', 'Firestorm', 'Hellfire', 'Pyroclast', 'Scorcher',
    'Blizzard', 'Frostbite', 'Permafrost', 'Glacial',
    'Thunderclap', 'Thunderstrike', 'Megavolt', 'Zap',
    // Únicos/Originais
    'Maverick', 'Outlaw', 'Renegade', 'Rebel', 'Exile',
    'Nomad', 'Drifter', 'Vagrant', 'Wanderer', 'Mercenary',
    'Ironclad', 'Ironside', 'Ironjaw', 'Ironfist', 'Ironwall',
    'Hardsteel', 'Coldblood', 'Deadshot', 'Killshot', 'Warpath',
  ],

  // ── Femininos ──
  female: [
    // Animais (graciosos/poderosos)
    'Vixen', 'Viper', 'Tigress', 'Lioness', 'Pantera', 'She-Wolf',
    'Raven', 'Harpy', 'Valkyrie', 'Siren', 'Banshee',
    'Black Widow', 'Mantis', 'Scorpia', 'Medusa',
    'Phoenix', 'Firebird', 'Seraph', 'Empress Swan',
    // Fenômenos / Natureza feminina
    'Aurora', 'Tempest', 'Gale', 'Cyclone', 'Maelstrom', 'Typhoon',
    'Blizzard', 'Frost', 'Glacial', 'Snowstorm', 'Hailfire',
    'Ember', 'Scorch', 'Flare', 'Cinder', 'Wildfire', 'Pyre',
    'Torrent', 'Riptide', 'Cascade', 'Deluge', 'Tidal',
    // Celestiais/Cósmicas
    'Nova', 'Lyra', 'Vega', 'Lyra', 'Cassiopeia', 'Andromeda',
    'Celeste', 'Solara', 'Lunara', 'Stellara', 'Astraea',
    'Nebula', 'Galaxy', 'Comet', 'Eclipse', 'Solaris',
    // Mitologia feminina
    'Athena', 'Artemis', 'Diana', 'Hera', 'Hestia', 'Nike',
    'Sekhmet', 'Isis', 'Bastet', 'Nyx', 'Selene', 'Eos', 'Iris',
    'Freya', 'Hela', 'Skadi', 'Sigrun', 'Brynhildr',
    'Kali', 'Durga', 'Parvati', 'Lakshmi', 'Saraswati',
    // Conceitos elegantes/perigosos
    'Shadow', 'Shade', 'Silhouette', 'Ghost', 'Wraith', 'Specter',
    'Mirage', 'Illusion', 'Enigma', 'Cipher', 'Riddle',
    'Venom', 'Toxin', 'Hex', 'Curse', 'Jinx', 'Doom',
    // Títulos femininos
    'Queen', 'Empress', 'Czarina', 'Duchess', 'Lady', 'Countess',
    'Dame', 'Sovereign', 'Matriarch', 'Warlordess', 'Sentinel',
    // Personalidade / Arquétipos
    'Maverick', 'Renegade', 'Outlaw', 'Rebel', 'Exile',
    'Nomad', 'Drifter', 'Wanderer', 'Phantom', 'Oracle',
    'Prodigy', 'Whiz', 'Ace', 'Elite', 'Apex',
    // Únicos originais
    'Ironheart', 'Steelrose', 'Coldflame', 'Blackthorn', 'Stormborn',
    'Deathwhisper', 'Lightbane', 'Nightfall', 'Dawnbreaker', 'Starfall',
    'Silverblade', 'Goldenfire', 'Crystalheart', 'Soulfire', 'Bloodmoon',
  ],
};

const COLOR_PALETTE = [
  // Vermelhos
  '#dc2626', '#ef4444', '#f87171', '#b91c1c', '#991b1b',
  // Laranjas
  '#ea580c', '#f97316', '#fb923c', '#c2410c', '#9a3412',
  // Amarelos
  '#d97706', '#f59e0b', '#fbbf24', '#b45309', '#92400e',
  '#ca8a04', '#eab308', '#facc15',
  // Verdes
  '#65a30d', '#84cc16', '#a3e635', '#4d7c0f', '#16a34a',
  '#059669', '#10b981', '#34d399', '#047857',
  // Azuis/Ciano
  '#0891b2', '#06b6d4', '#22d3ee', '#0e7490', '#0284c7',
  '#2563eb', '#3b82f6', '#60a5fa', '#1d4ed8', '#1e40af',
  // Roxos
  '#4f46e5', '#6366f1', '#818cf8', '#4338ca', '#7c3aed',
  '#9333ea', '#a855f7', '#c084fc', '#7e22ce',
  // Magentas/Rosa
  '#c026d3', '#d946ef', '#e879f9', '#a21caf', '#db2777',
  '#e11d48', '#f43f5e', '#fb7185',
  // Neutros
  '#ffffff', '#000000', '#374151', '#4b5563', '#6b7280',
  '#9ca3af', '#1f2937', '#111827'
];

const ARENA_POOL = [
  'BB10_COMPETITIVE', 'STORM_TRACK', 'VOLCANO_CRATER', 'DESERT_STORM',
  'NEON_DISTRICT', 'ANCIENT_RUINS', 'CYBER_DOME', 'FOREST_ARENA',
  'ICE_PALACE', 'THUNDER_DOME', 'CRYSTAL_CAVERN', 'ORBITAL_STATION'
];

const MENTALITIES = [
  'ALL_ROUNDER', 'GLASS_CANNON', 'IRON_FORTRESS', 'HIGH_RISK_GAMBLER',
  'ETERNAL_SPINNER', 'PERFECTIONIST', 'ADAPTIVE_TACTICIAN', 'MOMENTUM_MASTER'
];

// ============================================
// 🎲 CLASSE PRINCIPAL: NewgenEngine
// ============================================

export class NewgenEngine {
  constructor() {
    this.generatedCount = 0;
    this.nameHistory = new Set(); // Evitar duplicatas
    this.idCounter = 1000; // IDs começam em 1000
  }

  // ============================================
  // 🌟 MÉTODOS PRINCIPAIS
  // ============================================

  /**
   * Gera um único newgen completo
   * @param {object} options - Opções customizadas (opcional)
   * @returns {object} Jogador newgen completo
   */
  generateNewgen(options = {}) {
    const country = options.country || this.selectRandomCountry();
    const region = this.getRegionFromCountry(country);
    const age = options.age || this.rollAge();
    const mentality = options.mentality || this.rollMentality();
    const category = options.category || this.rollPotentialCategory();
    const totalPoints = this.generateTotalPoints(category);
    const revealPercent = this.generateRevealPercent();
    
    // Gerar gender: 60% male, 40% female
    const gender = Math.random() < 0.60 ? 'male' : 'female';
    
    // Gerar nome único
    let name, attempts = 0;
    do {
      name = this.generateName(region, gender);
      attempts++;
      if (attempts > 100) {
        // Fallback: adicionar número ao nome
        name = `${name} ${this.idCounter}`;
        break;
      }
    } while (this.nameHistory.has(name));
    
    this.nameHistory.add(name);
    
    // Gerar atributos iniciais
    const attributes = this.generateInitialAttributes(category, totalPoints, revealPercent, mentality);
    
    // Gerar estilo de desenvolvimento
    const developmentStyle = this.rollDevelopmentStyle();
    
    // Gerar traits
    const traitDNA = generateTraitDNA();
    const traitResult = this.rollInitialTraits(category, traitDNA);
    
    // Cores e visual
    const colors = this.generateColors();
    const favoriteArena = this.selectRandomArena();
    const physicalDesc = this.generatePhysicalDesc();
    
    // Calcular alcunha
    const alcunha = determineAlcunha({ category, revealPercent }, attributes);
    
    // Play style baseado na mentality
    const playStyle = this.generatePlayStyle(mentality);
    
    // ID único
    const id = `NEWGEN_${this.idCounter++}`;
    
    // Gerar imagens do banco por região
    const images = this.generateImages(name, gender, country, id);
    
    const newgen = {
      id,
      name,
      nickname: this.extractNickname(name),
      country,
      age,
      photoUrl: images.photoUrl,
      iconUrl: images.iconUrl,
      fullBodyUrl: images.fullBodyUrl,
      physicalDesc,
      colors,
      gender,
      mentality,
      favoriteArena,
      playStyle,
      
      attributes,
      
      potential: {
        category,
        totalPoints,
        pointsEarned: Math.floor(totalPoints * revealPercent),
        pointsRemaining: Math.floor(totalPoints * (1 - revealPercent)),
        growthPool: 0.0,
        declinePool: 0.0,
        declinedPoints: 0,
        breakthroughBonus: 0,
        revealPercent,
        alcunha,
        thresholds: calculateThresholds(totalPoints),
      },
      
      developmentStyle,
      
      development: {
        yearsActive: 0,
        lastGrowth: 0,
        totalGrowth: 0,
        breakthroughs: 0,
        regressions: 0
      },
      
      traits:         traitResult.traits,
      traitDNA,
      traitNegTypes:  traitResult.negTypes,
      shadowProgress: traitResult.shadowProgress,
      traitMilestones: {          // marcos desbloqueados (controlam slots positivos)
        firstTitle:     false,
        comeback02:     false,
        rivalryFormed:  false,
        reachedPeak:    false,
      },
      
      status: 'RISING_STAR',
      debutYear: new Date().getFullYear(),
      tier: 'ROOKIE',
      
      // Campos de carreira
      elo: 1000,
      wins: 0,
      losses: 0,
      titlesWon: 0
    };
    
    this.generatedCount++;
    
    console.log(`✅ Newgen criado: ${name} (${country}) - ${category} - ${age} anos`);
    
    return newgen;
  }

  /**
   * Gera um pool inicial de newgens
   * @param {number} count - Número de newgens a gerar (padrão: 16)
   * @returns {Array} Array de newgens
   */
  initializeRisingStarPool(count = 16) {
    console.log(`🌟 Gerando ${count} newgens para Rising Star Pool...`);
    
    const newgens = [];
    
    for (let i = 0; i < count; i++) {
      const newgen = this.generateNewgen();
      newgens.push(newgen);
    }
    
    console.log(`✅ ${count} newgens gerados com sucesso!`);
    this.logDistributionStats(newgens);
    
    return newgens;
  }

  /**
   * Reposição automática de newgens
   * @param {Array} currentPool - Pool atual de rising stars
   * @param {number} targetSize - Tamanho alvo do pool (padrão: 16)
   * @returns {Array} Novos newgens gerados
   */
  checkAndReplenish(currentPool, targetSize = 16) {
    const needed = targetSize - currentPool.length;
    
    if (needed <= 0) {
      return [];
    }
    
    console.log(`⭐ Repondo ${needed} newgens...`);
    
    const newgens = [];
    for (let i = 0; i < needed; i++) {
      const newgen = this.generateNewgen();
      newgens.push(newgen);
    }
    
    console.log(`✅ ${needed} newgens gerados para reposição`);
    
    return newgens;
  }

  // ============================================
  // 🌍 GERAÇÃO DE IDENTIDADE
  // ============================================

  selectRandomCountry() {
    const roll = Math.random();
    
    if (roll < 0.30) {
      // Américas (30%)
      return this.randomFromArray(COUNTRIES_BY_REGION.americas);
    }
    else if (roll < 0.60) {
      // Europa (30%)
      return this.randomFromArray(COUNTRIES_BY_REGION.europe);
    }
    else if (roll < 0.80) {
      // Ásia (20%)
      return this.randomFromArray(COUNTRIES_BY_REGION.asia);
    }
    else if (roll < 0.95) {
      // África (15%)
      return this.randomFromArray(COUNTRIES_BY_REGION.africa);
    }
    else {
      // Oceania (5%)
      return this.randomFromArray(COUNTRIES_BY_REGION.oceania);
    }
  }

  getRegionFromCountry(country) {
    for (const [region, countries] of Object.entries(COUNTRIES_BY_REGION)) {
      if (countries.includes(country)) {
        return region;
      }
    }
    return 'americas'; // Fallback
  }

  generateName(region, gender = 'male') {
    const bank = NAME_BANKS[region] || NAME_BANKS.americas;
    const firstNamePool = gender === 'female' ? bank.female : bank.male;
    const firstName = this.randomFromArray(firstNamePool);
    const lastName  = this.randomFromArray(bank.lastNames);
    const nickname  = this.generateNickname(gender);
    return `${firstName} "${nickname}" ${lastName}`;
  }

  generateNickname(gender = 'male') {
    // Combina neutros + específicos do gênero, com peso maior nos específicos
    const pool = [
      ...NICKNAME_POOL.neutral,
      ...NICKNAME_POOL.neutral, // peso duplo nos neutros para maior variedade
      ...(gender === 'female' ? NICKNAME_POOL.female : NICKNAME_POOL.male),
    ];
    return this.randomFromArray(pool);
  }

  extractNickname(fullName) {
    const match = fullName.match(/"([^"]+)"/);
    return match ? match[1] : '';
  }

  // ============================================
  // 🎲 GERAÇÃO DE POTENCIAL
  // ============================================

  rollPotentialCategory() {
    const roll = Math.random() * 100;
    
    if (roll < 0.5) return 'GERACIONAL';      // 0.5%
    if (roll < 2.5) return 'LENDA';           // 2%
    if (roll < 10.5) return 'ELITE';          // 8%
    if (roll < 30.5) return 'CAMPEAO';        // 20%
    if (roll < 80.5) return 'COMUM';          // 50%
    return 'ABAIXO_DA_MEDIA';                 // 19.5%
  }

  generateTotalPoints(category) {
    const ranges = {
      'GERACIONAL': [120, 135],
      'LENDA': [105, 119],
      'ELITE': [85, 104],
      'CAMPEAO': [65, 84],
      'COMUM': [45, 64],
      'ABAIXO_DA_MEDIA': [25, 44]
    };
    
    const [min, max] = ranges[category];
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  generateRevealPercent() {
    // 40-80% do potencial já desenvolvido
    return 0.40 + (Math.random() * 0.40);
  }

  // ============================================
  // 📊 GERAÇÃO DE ATRIBUTOS
  // ============================================

  generateInitialAttributes(category, totalPoints, revealPercent, mentality) {
    const developedPoints = Math.floor(totalPoints * revealPercent);
    const priorities = MENTALITY_STAT_PRIORITIES[mentality] || MENTALITY_STAT_PRIORITIES.ALL_ROUNDER;
    const allStats = ['attack', 'defense', 'stamina', 'speed', 'technique', 'launchPower', 'intelligence', 'adaptability', 'clutch'];

    // Base diferenciada por prioridade:
    // Primary: 4 | Secondary: 3 | Tertiary: 3 | Não listado: 2
    const attributes = {};
    const primarySet  = new Set(priorities.primary);
    const secondarySet = new Set(priorities.secondary);
    const tertiarySet  = new Set(priorities.tertiary);

    let baseTotal = 0;
    allStats.forEach(s => {
      let base;
      if      (primarySet.has(s))   base = 4;
      else if (secondarySet.has(s)) base = 3;
      else if (tertiarySet.has(s))  base = 3;
      else                          base = 2;
      attributes[s] = base;
      baseTotal += base;
    });

    // Adicionar ruído pequeno na base (±1) para evitar cópias idênticas
    allStats.forEach(s => {
      if (Math.random() < 0.25) {
        if (primarySet.has(s) && attributes[s] < DEV_CONSTANTS.MAX_STAT_VALUE)
          attributes[s]++;
        else if (!primarySet.has(s) && attributes[s] > 1)
          attributes[s]--;
      }
    });

    // Recalcular total base após ruído
    baseTotal = allStats.reduce((sum, s) => sum + attributes[s], 0);

    // Pontos extras para distribuir com base na mentalidade
    const remainingPoints = Math.max(0, developedPoints - baseTotal);
    if (remainingPoints === 0) return attributes;

    const primaryPoints   = Math.floor(remainingPoints * 0.65);
    const secondaryPoints = Math.floor(remainingPoints * 0.22);
    const tertiaryPoints  = remainingPoints - primaryPoints - secondaryPoints;

    this.distributePriority(attributes, priorities.primary, primaryPoints);
    this.distributePriority(attributes, priorities.secondary, secondaryPoints);
    this.distributePriority(attributes, priorities.tertiary, tertiaryPoints);

    return attributes;
  }

  distributePriority(attributes, statList, points) {
    for (let i = 0; i < points; i++) {
      // Selecionar stat aleatório da lista
      const validStats = statList.filter(s => attributes[s] < DEV_CONSTANTS.MAX_STAT_VALUE);
      
      if (validStats.length === 0) {
        // Todos os stats desta prioridade já estão no máximo
        // Tentar qualquer stat disponível
        const allStats = Object.keys(attributes);
        const anyValid = allStats.filter(s => attributes[s] < DEV_CONSTANTS.MAX_STAT_VALUE);
        
        if (anyValid.length === 0) {
          // Todos os stats em 15 - impossível distribuir mais
          break;
        }
        
        const stat = this.randomFromArray(anyValid);
        attributes[stat]++;
      } else {
        const stat = this.randomFromArray(validStats);
        attributes[stat]++;
      }
    }
  }

  // ============================================
  // 🎭 GERAÇÃO DE ESTILO
  // ============================================

  rollMentality() {
    return this.randomFromArray(MENTALITIES);
  }

  rollDevelopmentStyle() {
    const roll = Math.random();
    
    if (roll < 0.20) {
      // Early Bloomer (20%)
      return { archetype: 'EARLY_BLOOMER', peakAge: [23, 28], growthRate: 3.2,  declineRate: 3.55 };
    }
    else if (roll < 0.27) {
      // Volatile (7%)
      return { archetype: 'VOLATILE',      peakAge: [22, 27], growthRate: 3.5,  declineRate: 4.20 };
    }
    else if (roll < 0.34) {
      // Diamond (7%)
      return { archetype: 'DIAMOND',       peakAge: [28, 34], growthRate: 2.0,  declineRate: 1.74 };
    }
    else if (roll < 0.75) {
      // Steady (41%)
      return { archetype: 'STEADY',        peakAge: [27, 32], growthRate: 2.5,  declineRate: 1.75 };
    }
    else {
      // Late Bloomer (25%)
      return { archetype: 'LATE_BLOOMER',  peakAge: [30, 35], growthRate: 1.8,  declineRate: 0.87 };
    }
  }

  rollInitialTraits(category, traitDNA) {
    // Delegado ao TraitDNASystem — retorna { traits, negTypes, shadowProgress }
    return generateInitialTraits(category, traitDNA);
  }

  rollAge() {
    // 14-18 anos
    return 14 + Math.floor(Math.random() * 5);
  }

  // ============================================
  // 🎨 GERAÇÃO VISUAL
  // ============================================

  generateColors() {
    const colors = [];
    const available = [...COLOR_PALETTE];
    
    for (let i = 0; i < 3; i++) {
      if (available.length === 0) break;
      
      const index = Math.floor(Math.random() * available.length);
      colors.push(available[index]);
      available.splice(index, 1); // Remover para evitar duplicatas
    }
    
    return colors;
  }

  generatePhysicalDesc() {
    const height = 165 + Math.floor(Math.random() * 25); // 165-190cm
    const weight = 60 + Math.floor(Math.random() * 30);  // 60-90kg
    
    const bodyTypes = [
      'magro e ágil', 'atlético', 'forte e robusto', 
      'esbelto', 'compacto', 'musculoso', 'franzino',
      'bem construído', 'tonificado'
    ];
    const bodyType = this.randomFromArray(bodyTypes);
    
    return `Altura: ${(height / 100).toFixed(2)}m | Peso: ${weight}kg | Corpo ${bodyType}`;
  }

  generateImages(name, gender = 'male', country = '', playerId = '') {
    // Busca imagem disponível no banco por região/gênero
    const url = assignImage(country, gender, playerId) || null;
    return {
      photoUrl:    url,
      iconUrl:     url,
      fullBodyUrl: null   // newgens não têm full body art
    };
  }

  selectRandomArena() {
    return this.randomFromArray(ARENA_POOL);
  }

  generatePlayStyle(mentality) {
    const styles = {
      'ALL_ROUNDER': 'Equilibrado - Combina todas as facetas do jogo com maestria',
      'GLASS_CANNON': 'Ataque Extremo - Poder ofensivo devastador com pouca defesa',
      'IRON_FORTRESS': 'Defesa Impenetrável - Muralha defensiva que frustra adversários',
      'HIGH_RISK_GAMBLER': 'Alto Risco - Joga no limite buscando grandes recompensas',
      'ETERNAL_SPINNER': 'Desgaste - Esgota oponentes com resistência sobre-humana',
      'PERFECTIONIST': 'Técnica Pura - Precisão cirúrgica em cada movimento',
      'ADAPTIVE_TACTICIAN': 'Versátil - Adapta-se a qualquer situação instantaneamente',
      'MOMENTUM_MASTER': 'Clutch - Brilha nos momentos mais decisivos'
    };
    
    return styles[mentality] || 'Estilo único de combate';
  }

  // ============================================
  // 🛠️ UTILIDADES
  // ============================================

  randomFromArray(array) {
    return array[Math.floor(Math.random() * array.length)];
  }

  // ============================================
  // 📊 ESTATÍSTICAS E LOGS
  // ============================================

  logDistributionStats(newgens) {
    console.log('\n📊 ESTATÍSTICAS DE DISTRIBUIÇÃO:');
    
    // Distribuição geográfica
    const regionCounts = {};
    newgens.forEach(ng => {
      const region = this.getRegionFromCountry(ng.country);
      regionCounts[region] = (regionCounts[region] || 0) + 1;
    });
    console.log('🌍 Distribuição Regional:', regionCounts);
    
    // Distribuição de potencial
    const potentialCounts = {};
    newgens.forEach(ng => {
      potentialCounts[ng.potential.category] = (potentialCounts[ng.potential.category] || 0) + 1;
    });
    console.log('⭐ Distribuição de Potencial:', potentialCounts);
    
    // Distribuição de mentalidades
    const mentalityCounts = {};
    newgens.forEach(ng => {
      mentalityCounts[ng.mentality] = (mentalityCounts[ng.mentality] || 0) + 1;
    });
    console.log('🎭 Distribuição de Mentalidades:', mentalityCounts);
    
    // Distribuição de idades
    const ageCounts = {};
    newgens.forEach(ng => {
      ageCounts[ng.age] = (ageCounts[ng.age] || 0) + 1;
    });
    console.log('🎂 Distribuição de Idades:', ageCounts);
    
    // Distribuição de traits e traitDNA
    const traitCounts = { 2: 0 }; // sempre 1 pos + 1 neg = 2
    const dnaBuckets  = { BAIXO: 0, MEDIO: 0, NORMAL: 0, ALTO: 0, EXCEPCIONAL: 0 };
    newgens.forEach(ng => {
      traitCounts[ng.traits.length] = (traitCounts[ng.traits.length] || 0) + 1;
      const profile = getTraitDNAProfile(ng.traitDNA || 50);
      dnaBuckets[profile.label] = (dnaBuckets[profile.label] || 0) + 1;
    });
    console.log('🏅 Distribuição de Traits:', traitCounts);
    console.log('🧬 Distribuição traitDNA:', dnaBuckets);
    
    console.log('');
  }

  getStats() {
    return {
      totalGenerated: this.generatedCount,
      uniqueNames: this.nameHistory.size,
      nextId: this.idCounter
    };
  }

  reset() {
    this.generatedCount = 0;
    this.nameHistory.clear();
    this.idCounter = 1000;
    console.log('🔄 NewgenEngine resetado');
  }
}

// ============================================
// 🧪 FUNÇÃO DE TESTE (opcional)
// ============================================

export function testNewgenEngine() {
  console.log('🧪 INICIANDO TESTE DO NEWGEN ENGINE\n');
  
  const engine = new NewgenEngine();
  
  // Teste 1: Gerar 1 newgen
  console.log('📝 Teste 1: Gerar 1 newgen');
  const single = engine.generateNewgen();
  console.log('Nome:', single.name);
  console.log('País:', single.country);
  console.log('Potencial:', single.potential.category);
  console.log('Mentalidade:', single.mentality);
  console.log('');
  
  // Teste 2: Gerar pool de 16
  console.log('📝 Teste 2: Gerar pool de 16 newgens');
  const pool = engine.initializeRisingStarPool(16);
  console.log(`Pool gerado: ${pool.length} jogadores`);
  console.log('');
  
  // Teste 3: Validar distribuição de raridade em 200 newgens
  console.log('📝 Teste 3: Validar raridade (200 newgens)');
  const testEngine = new NewgenEngine();
  const rarities = {
    GERACIONAL: 0,
    LENDA: 0,
    ELITE: 0,
    CAMPEAO: 0,
    COMUM: 0,
    ABAIXO_DA_MEDIA: 0
  };
  
  for (let i = 0; i < 200; i++) {
    const ng = testEngine.generateNewgen();
    rarities[ng.potential.category]++;
  }
  
  console.log('Distribuição de raridade em 200 newgens:');
  console.log('GERACIONAL:', rarities.GERACIONAL, '(esperado: ~1)');
  console.log('LENDA:', rarities.LENDA, '(esperado: ~4)');
  console.log('ELITE:', rarities.ELITE, '(esperado: ~16)');
  console.log('CAMPEÃO:', rarities.CAMPEAO, '(esperado: ~40)');
  console.log('COMUM:', rarities.COMUM, '(esperado: ~100)');
  console.log('ABAIXO DA MÉDIA:', rarities.ABAIXO_DA_MEDIA, '(esperado: ~39)');
  console.log('');
  
  // Teste 4: Stats do engine
  console.log('📝 Teste 4: Stats do engine');
  const stats = engine.getStats();
  console.log('Total gerado:', stats.totalGenerated);
  console.log('Nomes únicos:', stats.uniqueNames);
  console.log('');
  
  console.log('✅ TESTES CONCLUÍDOS');
  
  return { engine, pool };
}
