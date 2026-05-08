/**
 * NewgenSystem.js
 * ─────────────────────────────────────────────────────────────────
 * Geração procedural de novos jogadores para o modo carreira.
 *
 * Export principal:
 *   generateNewgen(seasonYear, options?) → objeto de jogador completo,
 *   compatível com NAMED_PLAYERS e o DevelopmentSystem.
 *
 * Dependências:
 *   DevelopmentConstants.js  — POTENTIAL_CATEGORIES, CAREER_ARCS, ALCUNHAS
 *   DevelopmentSystem.js     — evaluateAlcunha
 */

import {
  POTENTIAL_CATEGORIES,
  CAREER_ARCS,
  DEVELOPMENT_CONFIG,
  getPotentialCategory,
  getCareerArc,
  rollOvrTarget,
} from './DevelopmentConstants.js';

import { evaluateAlcunha } from './DevelopmentSystem.js';
import { generateKits } from './pixel/appearances.js';
import { initPlayerDNA, assignTraits } from './TraitSystem.js';
import { generateTournamentPreferences } from './TournamentPreferences.js';
import { assignNewgenPhoto } from './NewgenImagePool.js';
import {
  PLAY_STYLES,
  RALLY_PATTERNS,  RALLY_PATTERN_KEYS,
} from './styles.js';
import { rollSignaturePattern } from './SignaturePatterns.js';
import { rollPlayerSignature } from './SignatureShots.js';
import { generatePersonality } from './PlayerPersonality.js';
import { generateLifeData } from './PlayerLifeData.js';
import { migrateLifeEventLog } from './LifeEventSystem.js';
import {
  BUILD_STYLE_META, NET_GAME_META, RALLY_CADENCE_META, RISK_PROFILE_META,
  generatePrefs,
} from './playerPrefs.js';

// Chaves disponíveis para randomização aleatória de prefs
const _BUILD_STYLE_KEYS    = Object.keys(BUILD_STYLE_META);
const _NET_GAME_KEYS       = Object.keys(NET_GAME_META);
const _RALLY_CADENCE_KEYS  = Object.keys(RALLY_CADENCE_META);
const _RISK_PROFILE_KEYS   = Object.keys(RISK_PROFILE_META);

/**
 * Gera prefs completamente aleatórias para um newgen.
 * Adaptability ainda deriva dos attrs (mentalidade + leitura).
 */
function generateRandomPrefs(attrs) {
  const base = generatePrefs(attrs); // para pegar o adaptability correto
  return {
    buildStyle:   _BUILD_STYLE_KEYS[Math.floor(Math.random()   * _BUILD_STYLE_KEYS.length)],
    netGame:      _NET_GAME_KEYS[Math.floor(Math.random()      * _NET_GAME_KEYS.length)],
    rallyCadence: _RALLY_CADENCE_KEYS[Math.floor(Math.random() * _RALLY_CADENCE_KEYS.length)],
    riskProfile:  _RISK_PROFILE_KEYS[Math.floor(Math.random()  * _RISK_PROFILE_KEYS.length)],
    adaptability: base.adaptability,
    serveProfile: base.serveProfile,
    serve1Bias:   base.serve1Bias,
    serve2Bias:   base.serve2Bias,
    pressureServe: base.pressureServe,
  };
}


// ═══════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randFloat(min, max) {
  return Math.random() * (max - min) + min;
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/** Rolagem ponderada: array de { id, weight } → id sorteado */
function weightedRandom(items) {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item.id;
  }
  return items[items.length - 1].id;
}


// ═══════════════════════════════════════════════════════════════════
// POOLS DE NOMES POR NACIONALIDADE
// ═══════════════════════════════════════════════════════════════════

const NAME_POOLS = {
  // ── Europa Ocidental ──────────────────────────────────────────
  ITA: {
    first: [
      'Marco', 'Luca', 'Alessandro', 'Giovanni', 'Federico', 'Matteo', 'Andrea', 'Filippo', 'Lorenzo', 'Davide',
      'Simone', 'Riccardo', 'Emanuele', 'Nicola', 'Antonio', 'Fabio', 'Giorgio', 'Daniele', 'Paolo', 'Roberto',
      'Leonardo', 'Stefano', 'Enrico', 'Massimo', 'Cristiano', 'Edoardo', 'Pietro', 'Giacomo', 'Mattia', 'Salvatore',
      'Claudio', 'Franco', 'Angelo', 'Mario', 'Vincenzo', 'Luigi',
    ],
    last: [
      'Conti', 'Ferrara', 'Esposito', 'Ricci', 'Bianchi', 'Moretti', 'Romano', 'Colombo', 'Mancini', 'Vitale',
      'Ferrari', 'Russo', 'Gallo', 'Costa', 'Fontana', 'Barbieri', 'Santoro', 'Marini', 'De Luca', 'Giordano',
      'Lombardi', 'Caruso', 'Greco', 'Pellegrini', 'Martinelli', 'Coppola', 'Ferri', 'Bruno', 'Leone', 'Villa',
      'Sorrentino', 'Cattaneo', 'Basile', 'Montanari', 'Fabbri', 'Riva',
    ],
  },
  ESP: {
    first: [
      'Carlos', 'Pablo', 'Alejandro', 'Sergio', 'Javier', 'Miguel', 'Roberto', 'Diego', 'Álvaro', 'Iván',
      'Adrián', 'Rafael', 'Andrés', 'Manuel', 'Jorge', 'Rubén', 'Víctor', 'Raúl', 'Eduardo', 'Guillermo',
      'Tomás', 'Fernando', 'Emilio', 'David', 'Cristóbal', 'Nicolás', 'Rodrigo', 'Enrique', 'Marcos', 'Ignacio',
      'Pelayo', 'Borja', 'Álex', 'Iker', 'Unai', 'Aitor',
    ],
    last: [
      'García', 'Martínez', 'López', 'Sánchez', 'Romero', 'Torres', 'Jiménez', 'Navarro', 'Moreno', 'Ruiz',
      'Hernández', 'Díaz', 'Vázquez', 'Alonso', 'Fernández', 'Molina', 'Ortega', 'Ramos', 'Delgado', 'Castro',
      'Ortiz', 'Rubio', 'Marín', 'Campos', 'Herrera', 'Serrano', 'Reyes', 'Suárez', 'Prieto', 'Blanco',
      'Cabrera', 'Medina', 'Aguilar', 'Fuentes', 'Guerrero', 'Vidal',
    ],
  },
  FRA: {
    first: [
      'Antoine', 'Baptiste', 'Clément', 'Damien', 'Étienne', 'François', 'Gauthier', 'Hugo', 'Julien', 'Kevin',
      'Lucas', 'Maxime', 'Nicolas', 'Olivier', 'Pierre', 'Quentin', 'Romain', 'Samuel', 'Thomas', 'Vincent',
      'Adrien', 'Alexis', 'Arthur', 'Benoît', 'Charles', 'Dylan', 'Florian', 'Guillaume', 'Luca', 'Mathieu',
      'Théo', 'Nolan', 'Rémi', 'Erwan', 'Loïc', 'Yann',
    ],
    last: [
      'Dupont', 'Martin', 'Bernard', 'Lefebvre', 'Moreau', 'Simon', 'Laurent', 'Petit', 'Thomas', 'Girard',
      'Leroy', 'Rousseau', 'Mercier', 'Fontaine', 'Fournier', 'Garnier', 'Blanc', 'Gaillard', 'Perrin', 'Morin',
      'Faure', 'Bouchard', 'Denis', 'Masson', 'Arnaud', 'Renard', 'Bonnet', 'Rey', 'Picard', 'Meyer',
      'Chevalier', 'Besson', 'Renaud', 'Collet', 'Lacroix', 'Aubert',
    ],
  },
  GER: {
    first: [
      'Felix', 'Jonas', 'Lukas', 'Maximilian', 'Niklas', 'Patrick', 'Simon', 'Stefan', 'Tobias', 'Alexander',
      'Florian', 'Jan', 'Markus', 'Michael', 'Sebastian', 'Thomas', 'Andreas', 'Daniel', 'Fabian', 'Philipp',
      'Lars', 'Sven', 'Christoph', 'Dominik', 'Henrik', 'Julian', 'Kai', 'Leon', 'Moritz', 'René',
      'Tim', 'Benedikt', 'Erik', 'Finn', 'Hannes', 'Lasse',
    ],
    last: [
      'Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schulz',
      'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Schwarz', 'Zimmermann', 'Braun',
      'Krüger', 'Hofmann', 'Hartmann', 'Lange', 'Schmitt', 'Werner', 'Krause', 'Lehmann', 'Maier', 'Walter',
      'König', 'Kaiser', 'Fuchs', 'Herrmann', 'Jung', 'Vogt',
    ],
  },
  // ── Europa Central / Alpina ───────────────────────────────────
  CHE: {
    first: [
      'Roger', 'Marco', 'Luca', 'Fabian', 'Dominic', 'Jan', 'Noah', 'Patrick', 'David', 'Michael',
      'Stefan', 'Pascal', 'Reto', 'Sven', 'Christian', 'Lukas', 'Simon', 'Nicolas', 'Raphael', 'Samuel',
      'Andrin', 'Elia', 'Gian', 'Jonas', 'Kevin', 'Marc', 'Mattia', 'Noel', 'Robin', 'Tobias',
    ],
    last: [
      'Federer', 'Wawrinka', 'Müller', 'Kälin', 'Stricker', 'Baumann', 'Brunner', 'Frei', 'Huber', 'Keller',
      'Meier', 'Reuter', 'Schmid', 'Siegrist', 'Steiner', 'Weber', 'Zimmermann', 'Bürgi', 'Gerber', 'Graf',
      'Ritter', 'Suter', 'Wyss', 'Ammann', 'Brand', 'Gisler', 'Lüthi', 'Moser', 'Pfister', 'Studer',
    ],
  },
  AUT: {
    first: [
      'Dominic', 'Alexander', 'Philip', 'Lukas', 'Michael', 'Thomas', 'Daniel', 'David', 'Stefan', 'Martin',
      'Florian', 'Markus', 'Sebastian', 'Wolfgang', 'Andreas', 'Christoph', 'Felix', 'Julian', 'Klaus', 'Tobias',
      'Nico', 'Robert', 'Rainer', 'Patrick', 'Lorenz', 'Georg', 'Hans', 'Rudolf', 'Emil', 'Jakob',
    ],
    last: [
      'Thiem', 'Melzer', 'Ofner', 'Haas', 'Weiss', 'Gruber', 'Huber', 'Köck', 'Lang', 'Mayer',
      'Pichler', 'Riegler', 'Schweitzer', 'Steiner', 'Taschler', 'Tretter', 'Ullrich', 'Winkler', 'Zach', 'Fink',
      'Bauer', 'Berger', 'Braun', 'Gschwend', 'Leitner', 'Mayr', 'Müller', 'Nussbaumer', 'Rainer', 'Wiesner',
    ],
  },
  BEL: {
    first: [
      'David', 'Arthur', 'Zizou', 'Ruben', 'Xavier', 'Loïc', 'Simon', 'Grégoire', 'Robin', 'Sebastiaan',
      'Mathieu', 'Joran', 'Alex', 'Arne', 'Ben', 'Christophe', 'Filip', 'Julien', 'Kurt', 'Maxime',
      'Nicolas', 'Pieter', 'Rémi', 'Sander', 'Tom', 'Ward', 'Yannik', 'Cédric', 'Denis', 'Niels',
    ],
    last: [
      'Goffin', 'Mertens', 'Bemelmans', 'De Schepper', 'Vliegen', 'Bergs', 'Coppejans', 'Declercq', 'Dubaere', 'Gille',
      'Guns', 'Leunis', 'Malisse', 'Rochus', 'Steene', 'Tavernier', 'Vander Donckt', 'Witten', 'Zaman', 'Bogaert',
      'Clauwaert', 'Devos', 'Goffin', 'Henin', 'Jans', 'Lammens', 'Mottet', 'Pieters', 'Suys', 'Verbiest',
    ],
  },
  // ── Europa do Leste / Balkans ──────────────────────────────────
  RUS: {
    first: [
      'Aleksei', 'Dmitri', 'Ivan', 'Kirill', 'Maxim', 'Nikita', 'Pavel', 'Roman', 'Sergei', 'Vladimir',
      'Andrei', 'Anton', 'Artem', 'Evgeni', 'Fyodor', 'Grigori', 'Igor', 'Leonid', 'Mikhail', 'Nikolai',
      'Oleg', 'Pyotr', 'Ruslan', 'Stanislav', 'Timur', 'Vadim', 'Viktor', 'Vitali', 'Yaroslav', 'Yuri',
      'Boris', 'Danila', 'Gleb', 'Ilya', 'Konstantin', 'Lev',
    ],
    last: [
      'Volkov', 'Petrov', 'Smirnov', 'Kuznetsov', 'Popov', 'Sokolov', 'Lebedev', 'Kozlov', 'Novikov', 'Morozov',
      'Zverev', 'Medvedev', 'Rublev', 'Khachanov', 'Andreev', 'Andreev', 'Donskoi', 'Golubev', 'Istomin', 'Karatsev',
      'Kravchenko', 'Lapentti', 'Manafov', 'Naumkin', 'Orlov', 'Pavlov', 'Rogachev', 'Safin', 'Tikhonov', 'Ustinov',
      'Vasilevski', 'Voronov', 'Zotov', 'Cherkov', 'Filonov', 'Grin',
    ],
  },
  SRB: {
    first: [
      'Nikola', 'Stefan', 'Marko', 'Aleksa', 'Filip', 'Lazar', 'Milan', 'Bojan', 'Dragan', 'Igor',
      'Andrej', 'Bogdan', 'Dušan', 'Goran', 'Janko', 'Jovаn', 'Kristijan', 'Laslo', 'Mirza', 'Nenad',
      'Novak', 'Petar', 'Radovan', 'Sasha', 'Tomislav', 'Uroš', 'Vuk', 'Zdravko', 'Zoran', 'Aleksandar',
      'Branko', 'Darko', 'Emir', 'Miomir', 'Predrag', 'Slobodan',
    ],
    last: [
      'Đoković', 'Troicki', 'Krajinović', 'Lajović', 'Kecmanović', 'Milojević', 'Vasić', 'Bjelica', 'Stanković', 'Perić',
      'Ilić', 'Jovanović', 'Marković', 'Nikolić', 'Pavlović', 'Petrović', 'Popović', 'Radović', 'Simić', 'Stefanović',
      'Tošić', 'Vujić', 'Đurić', 'Lazović', 'Maksimović', 'Milić', 'Nedić', 'Rajković', 'Savić', 'Vuković',
      'Atić', 'Bogdanović', 'Dragović', 'Glumac', 'Kokić', 'Morić',
    ],
  },
  CRO: {
    first: [
      'Marin', 'Borna', 'Franko', 'Ivan', 'Nikola', 'Ante', 'Duje', 'Luka', 'Mate', 'Nino',
      'Boro', 'Darko', 'Goran', 'Josip', 'Krešimir', 'Mario', 'Pavle', 'Robert', 'Tin', 'Tomislav',
      'Antonio', 'Denis', 'Filip', 'Hrvoje', 'Lucijan', 'Petar', 'Roko', 'Sandro', 'Toni', 'Vedran',
    ],
    last: [
      'Čilić', 'Ćorić', 'Skugor', 'Dodig', 'Karlović', 'Ljubičić', 'Mektić', 'Pavić', 'Petrović', 'Skok',
      'Anić', 'Babić', 'Blažević', 'Horvat', 'Jelić', 'Kovač', 'Marjanović', 'Matić', 'Novak', 'Orešković',
      'Perušić', 'Prpić', 'Rađenović', 'Sekulić', 'Trbojevič', 'Ujević', 'Višak', 'Vuco', 'Žganjer', 'Žmak',
    ],
  },
  POL: {
    first: [
      'Hubert', 'Kamil', 'Łukasz', 'Michał', 'Paweł', 'Piotr', 'Rafał', 'Szymon', 'Tomasz', 'Wojciech',
      'Adam', 'Bartosz', 'Damian', 'Emil', 'Filip', 'Grzegorz', 'Jakub', 'Krzysztof', 'Marek', 'Marcin',
      'Mateusz', 'Patryk', 'Sebastian', 'Stanisław', 'Tadeusz', 'Wiktor', 'Zbigniew', 'Zygmunt', 'Arkadiusz', 'Cezary',
    ],
    last: [
      'Hurkacz', 'Janowicz', 'Kubot', 'Olejniczak', 'Pawlak', 'Świątek', 'Wawrinka', 'Zuk', 'Adamczyk', 'Baranowski',
      'Czajkowski', 'Dąbrowski', 'Grabowski', 'Jaworski', 'Klimek', 'Kowalski', 'Lewandowski', 'Majewski', 'Nowak', 'Piotrowiak',
      'Rutkowski', 'Sikorski', 'Stasiak', 'Tomczak', 'Urbański', 'Wierzbicki', 'Zając', 'Zieliński', 'Borkowski', 'Duda',
    ],
  },
  CZE: {
    first: [
      'Jiří', 'Tomáš', 'Lukáš', 'Radek', 'Adam', 'Jakub', 'Martin', 'Ondřej', 'Pavel', 'Petr',
      'David', 'Filip', 'Jaroslav', 'Josef', 'Karel', 'Marek', 'Michal', 'Milan', 'Miroslav', 'Patrik',
      'Roman', 'Stanislav', 'Vladimír', 'Vojtěch', 'Aleš', 'Bohuslav', 'Ctirad', 'Dalibor', 'Eduard', 'František',
    ],
    last: [
      'Stepanek', 'Berdych', 'Korda', 'Novak', 'Vesely', 'Šafárik', 'Blaha', 'Čermák', 'Dvořák', 'Fiala',
      'Holub', 'Kratochvíl', 'Kubát', 'Malý', 'Novotný', 'Pospíšil', 'Richtr', 'Sedláček', 'Šimánek', 'Tůma',
      'Urban', 'Vávra', 'Vlček', 'Zeman', 'Antoš', 'Burian', 'Doušek', 'Havlíček', 'Jelínek', 'Knotek',
    ],
  },
  GRE: {
    first: [
      'Stefanos', 'Michail', 'Alexandros', 'Nikos', 'Thanasis', 'Kostas', 'Dimitris', 'Giorgos', 'Petros', 'Vasilis',
      'Andreas', 'Christos', 'Emmanouil', 'Fotis', 'Ioannis', 'Konstantinos', 'Leonidas', 'Panagiotis', 'Stelios', 'Tasos',
      'Aris', 'Elias', 'Giannis', 'Heraklis', 'Kyriakos', 'Markos', 'Miltos', 'Odys', 'Pavlos', 'Thanos',
    ],
    last: [
      'Tsitsipas', 'Davidou', 'Giatrakos', 'Kalogeropoulos', 'Lamprou', 'Mavromatis', 'Nikolaou', 'Papadopoulos', 'Petros', 'Siotis',
      'Apostolou', 'Christodoulou', 'Demiris', 'Eleftheriou', 'Filippos', 'Giannoulis', 'Hatzigeorgiou', 'Iliopoulos', 'Karageorgos', 'Katsikis',
      'Lagonikakis', 'Makris', 'Ntolas', 'Oikonomou', 'Papageorgiou', 'Roumpos', 'Sakellariou', 'Tzannis', 'Vasileiou', 'Zafeiris',
    ],
  },
  POR: {
    first: [
      'João', 'Pedro', 'Gonçalo', 'Rui', 'Frederico', 'Nuno', 'Vasco', 'Bernardo', 'Diogo', 'Tiago',
      'André', 'António', 'Carlos', 'Dário', 'Eduardo', 'Filipe', 'Henrique', 'Ivo', 'Jorge', 'Luís',
      'Manuel', 'Miguel', 'Nuno', 'Olavo', 'Paulo', 'Quim', 'Ricardo', 'Simão', 'Telmo', 'Ulisses',
    ],
    last: [
      'Sousa', 'Costa', 'Santos', 'Ferreira', 'Rodrigues', 'Martins', 'Carvalho', 'Araújo', 'Batista', 'Correia',
      'Fonseca', 'Gonçalves', 'Lopes', 'Marques', 'Moreira', 'Neves', 'Oliveira', 'Pereira', 'Pinto', 'Silva',
      'Teixeira', 'Vieira', 'Alves', 'Barbosa', 'Castro', 'Dias', 'Esteves', 'Figueiredo', 'Gomes', 'Henriques',
    ],
  },
  HUN: {
    first: [
      'Márton', 'Attila', 'Gábor', 'István', 'László', 'Péter', 'Tibor', 'Zoltán', 'Ádám', 'Bence',
      'Csaba', 'Dávid', 'Ervin', 'Ferenc', 'Gergely', 'Imre', 'János', 'Kristóf', 'Levente', 'Mátyás',
      'Norbert', 'Oros', 'Patrik', 'Roland', 'Sándor', 'Tamás', 'Viktor', 'Zsolt', 'András', 'Balázs',
    ],
    last: [
      'Fucsovics', 'Balázs', 'Barki', 'Csernyi', 'Dányi', 'Fal', 'Gyurkovics', 'Horváth', 'Jáhni', 'Kovács',
      'Köves', 'Máté', 'Molnár', 'Nagy', 'Papp', 'Rácz', 'Somogyi', 'Szabó', 'Tóth', 'Váradi',
      'Varga', 'Vincze', 'Zaka', 'Ács', 'Benczur', 'Egyed', 'Fekete', 'Gulyás', 'Hajdu', 'Kárpáti',
    ],
  },
  UKR: {
    first: [
      'Oleksandr', 'Serhiy', 'Andrii', 'Dmytro', 'Mykola', 'Viktor', 'Bohdan', 'Denys', 'Illia', 'Ivan',
      'Kyrylo', 'Maksym', 'Oleh', 'Pavlo', 'Roman', 'Ruslan', 'Taras', 'Vadym', 'Vasyl', 'Volodymyr',
      'Yaroslav', 'Yuriy', 'Artem', 'Danylo', 'Evhen', 'Fedir', 'Hryhoriy', 'Kostiantyn', 'Leonid', 'Mykhailo',
    ],
    last: [
      'Dolgopolov', 'Stakhovsky', 'Marchenko', 'Molchanov', 'Nedovyesov', 'Svitolina', 'Zverev', 'Baranovsky', 'Bondarenko', 'Chobanyan',
      'Derepasko', 'Fasano', 'Galkin', 'Ilhan', 'Kovalenko', 'Lyamkin', 'Mykhalchuk', 'Orlov', 'Pashenko', 'Remeniuk',
      'Savchenko', 'Taranov', 'Ursu', 'Vakulenko', 'Volkov', 'Yarko', 'Zhukov', 'Atavin', 'Bilyi', 'Chernov',
    ],
  },
  // ── Escandinávia / Nórdicos ───────────────────────────────────
  SWE: {
    first: [
      'Erik', 'Johan', 'Karl', 'Lars', 'Magnus', 'Mikael', 'Nils', 'Oskar', 'Pontus', 'Viktor',
      'Anders', 'Björn', 'Carl', 'Daniel', 'Elias', 'Filip', 'Gustav', 'Hampus', 'Isak', 'Jonas',
      'Kristian', 'Linus', 'Mattias', 'Niklas', 'Ola', 'Per', 'Robin', 'Simon', 'Tobias', 'Ulf',
      'Adam', 'Axel', 'Benjamin', 'Edvin', 'Frédérik', 'Hugo',
    ],
    last: [
      'Björk', 'Eriksson', 'Gustafsson', 'Hansson', 'Johansson', 'Larsson', 'Lindqvist', 'Nilsson', 'Svensson', 'Pettersson',
      'Lindstedt', 'Söderling', 'Enqvist', 'Arvidsson', 'Bergström', 'Carlsson', 'Dahl', 'Ekman', 'Holm', 'Isaksson',
      'Jansson', 'Karlsson', 'Lindén', 'Magnusson', 'Nordström', 'Olofsson', 'Persson', 'Qvist', 'Rydin', 'Sandström',
      'Lindberg', 'Thorén', 'Löfgren', 'Fransson', 'Wahlgren', 'Åkerström',
    ],
  },
  NOR: {
    first: [
      'Anders', 'Christian', 'Erik', 'Håkon', 'Jonas', 'Lars', 'Morten', 'Ola', 'Stig', 'Tor',
      'Casper', 'Espen', 'Frode', 'Gunnar', 'Harald', 'Ingvar', 'Jon', 'Knut', 'Leif', 'Magnus',
      'Nikolai', 'Ove', 'Pål', 'Rune', 'Sindre', 'Torbjørn', 'Ulrik', 'Vegard', 'Wilhelm', 'Yngve',
      'Bjørn', 'Dag', 'Frédérik', 'Henrik', 'Ivar', 'Joakim',
    ],
    last: [
      'Berg', 'Dahl', 'Hansen', 'Johansen', 'Larsen', 'Olsen', 'Andersen', 'Kristiansen', 'Haugen', 'Strand',
      'Ruud', 'Casper', 'Holm', 'Aas', 'Bakke', 'Christiansen', 'Eriksen', 'Fjeld', 'Gjerde', 'Hovde',
      'Iversen', 'Jakobsen', 'Kaas', 'Lunde', 'Moen', 'Nilsen', 'Nordal', 'Paulsen', 'Rasmussen', 'Sandvik',
      'Thomsen', 'Ulstad', 'Viken', 'Wold', 'Øverland', 'Åmot',
    ],
  },
  DEN: {
    first: [
      'Holger', 'Mikkel', 'Anders', 'Christian', 'Emil', 'Frederik', 'Jesper', 'Jonas', 'Lars', 'Mads',
      'Nikolaj', 'Ole', 'Peter', 'Rasmus', 'Sebastian', 'Thomas', 'Ulrik', 'Victor', 'Wilhelm', 'Adam',
      'Benjamin', 'Casper', 'David', 'Elias', 'Filip', 'Gustav', 'Henrik', 'Isak', 'Jakob', 'Kenneth',
    ],
    last: [
      'Rune', 'Tauson', 'Kjaersgaard', 'Friis', 'Christiansen', 'Nielsen', 'Andersen', 'Hansen', 'Jensen', 'Larsen',
      'Madsen', 'Møller', 'Pedersen', 'Rasmussen', 'Sørensen', 'Thomsen', 'Berg', 'Dahl', 'Eriksen', 'Feldman',
      'Gram', 'Holm', 'Iversen', 'Johansen', 'Kjær', 'Lund', 'Munk', 'Nygaard', 'Overgaard', 'Poulsen',
    ],
  },
  FIN: {
    first: [
      'Harri', 'Jarkko', 'Mikael', 'Pekka', 'Toni', 'Antti', 'Esa', 'Juha', 'Kimmo', 'Lauri',
      'Matti', 'Niko', 'Olli', 'Petteri', 'Riku', 'Sami', 'Teemu', 'Tuomas', 'Valtteri', 'Yle',
      'Aleksi', 'Bjarke', 'Elias', 'Hannu', 'Ilkka', 'Juhani', 'Kalevi', 'Lasse', 'Markku', 'Ossi',
    ],
    last: [
      'Nieminen', 'Kontinen', 'Virtanen', 'Mäkinen', 'Leinonen', 'Korhonen', 'Heikkinen', 'Mäkelä', 'Laitinen', 'Kärki',
      'Suominen', 'Tapio', 'Toivonen', 'Uusitalo', 'Väisänen', 'Anttila', 'Eskola', 'Hämäläinen', 'Hyvönen', 'Ikonen',
      'Jokinen', 'Karjalainen', 'Koskinen', 'Lehtinen', 'Mansikkala', 'Niemi', 'Oikarinen', 'Pihlajamäki', 'Räikkönen', 'Saarinen',
    ],
  },
  // ── Américas ─────────────────────────────────────────────────
  BRA: {
    first: [
      'André', 'Bruno', 'Carlos', 'Daniel', 'Eduardo', 'Felipe', 'Gabriel', 'Henrique', 'Igor', 'João',
      'Luan', 'Marcelo', 'Nathan', 'Otávio', 'Pedro', 'Rafael', 'Rodrigo', 'Thiago', 'Vinicius', 'William',
      'Alexandre', 'Bernardo', 'Caio', 'Diego', 'Fábio', 'Gustavo', 'Hugo', 'Julio', 'Leonardo', 'Marcos',
      'Matheus', 'Paulo', 'Ricardo', 'Sergio', 'Tiago', 'Victor',
    ],
    last: [
      'Silva', 'Santos', 'Oliveira', 'Souza', 'Costa', 'Lima', 'Carvalho', 'Almeida', 'Ferreira', 'Rodrigues',
      'Pereira', 'Gomes', 'Martins', 'Araújo', 'Rocha', 'Ribeiro', 'Alves', 'Cavalcante', 'Campos', 'Cardoso',
      'Correia', 'Cruz', 'Dias', 'Fonseca', 'Freitas', 'Gonçalves', 'Guimarães', 'Marques', 'Miranda', 'Monteiro',
      'Moura', 'Nascimento', 'Nunes', 'Pinto', 'Ramos', 'Xavier',
    ],
  },
  ARG: {
    first: [
      'Agustín', 'Diego', 'Ezequiel', 'Facundo', 'Gastón', 'Horacio', 'Ignacio', 'Joaquín', 'Leonardo', 'Marcos',
      'Nicolás', 'Pablo', 'Rodrigo', 'Santiago', 'Tomás', 'Alejandro', 'Andrés', 'Camilo', 'Eduardo', 'Franco',
      'Gonzalo', 'Hernán', 'Juan', 'Kevin', 'Leandro', 'Matías', 'Nahuel', 'Oscar', 'Ramiro', 'Sebastián',
      'Luciano', 'Mauricio', 'Esteban', 'Darío', 'Braian', 'Alexis',
    ],
    last: [
      'García', 'González', 'Rodríguez', 'Fernández', 'López', 'Martínez', 'Romero', 'Sosa', 'Torres', 'Álvarez',
      'Díaz', 'Pérez', 'Gómez', 'Flores', 'Herrera', 'Castro', 'Ruiz', 'Morales', 'Gutiérrez', 'Medina',
      'Acosta', 'Benítez', 'Cabrera', 'Delgado', 'Espinoza', 'Figueroa', 'Guerrero', 'Hidalgo', 'Ibáñez', 'Juárez',
      'Molina', 'Navarro', 'Ortega', 'Ponce', 'Quiroga', 'Vega',
    ],
  },
  USA: {
    first: [
      'Austin', 'Brandon', 'Chase', 'Dylan', 'Ethan', 'Finn', 'Grant', 'Hunter', 'Jake', 'Kyle',
      'Logan', 'Mason', 'Nathan', 'Owen', 'Parker', 'Quinn', 'Ryan', 'Spencer', 'Taylor', 'Tyler',
      'Alex', 'Blake', 'Caden', 'Dillon', 'Evan', 'Gavin', 'Harrison', 'Ian', 'Jordan', 'Kevin',
      'Liam', 'Michael', 'Noah', 'Oliver', 'Preston', 'Reid',
    ],
    last: [
      'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Wilson', 'Anderson', 'Taylor', 'Moore',
      'Jackson', 'Martin', 'Lee', 'Thompson', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Walker',
      'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nelson', 'Hill', 'Mitchell', 'Cooper',
      'Reed', 'Bailey', 'Bell', 'Collins', 'Evans', 'Gray',
    ],
  },
  CAN: {
    first: [
      'Felix', 'Denis', 'Milos', 'Vasek', 'Frank', 'Alexis', 'Benjamin', 'Charlie', 'Derek', 'Ethan',
      'Gabriel', 'Henry', 'Iain', 'Justin', 'Kai', 'Liam', 'Max', 'Noah', 'Oliver', 'Patrick',
      'Quinn', 'Ryan', 'Simon', 'Tyler', 'Victor', 'William', 'Xavier', 'Yannick', 'Zach', 'Andrew',
    ],
    last: [
      'Auger-Aliassime', 'Shapovalov', 'Raonic', 'Pospisil', 'Lapointe', 'Arsenault', 'Beauchamp', 'Bouchard', 'Carr', 'Diallo',
      'Frenette', 'Gagnon', 'Hébert', 'Innis', 'Jalbert', 'Kenny', 'Lavallee', 'Murphy', 'Ntim', 'Ouellette',
      'Parent', 'Quinn', 'Robertson', 'Stevens', 'Thompson', 'Underhill', 'Vaillancourt', 'Wilson', 'Young', 'Zorzato',
    ],
  },
  CHI: {
    first: [
      'Cristián', 'Nicolás', 'Alejandro', 'Diego', 'Felipe', 'Gonzalo', 'Ignacio', 'Joaquín', 'Luis', 'Matías',
      'Pablo', 'Rodrigo', 'Santiago', 'Tomás', 'Andrés', 'Carlos', 'Eduardo', 'Franco', 'Gastón', 'Héctor',
      'Juan', 'Kevin', 'Leandro', 'Marcelo', 'Nestor', 'Oscar', 'Patricio', 'Rafael', 'Sebastián', 'Víctor',
    ],
    last: [
      'Garin', 'Jarry', 'Tabilo', 'Barrios', 'Alvarez', 'Benítez', 'Cabrera', 'Díaz', 'Espinoza', 'Fuentes',
      'González', 'Herrera', 'Ibáñez', 'Jara', 'Klein', 'López', 'Méndez', 'Nuñez', 'Ortega', 'Pérez',
      'Quiroga', 'Rivera', 'Soto', 'Torres', 'Urrutia', 'Valdivia', 'Weiss', 'Yáñez', 'Zapata', 'Acuña',
    ],
  },
  COL: {
    first: [
      'Daniel', 'Santiago', 'Alejandro', 'Camilo', 'Carlos', 'Cristián', 'David', 'Eduardo', 'Felipe', 'Gonzalo',
      'Héctor', 'Ignacio', 'Joaquín', 'Juan', 'Kevin', 'Leonardo', 'Miguel', 'Nelson', 'Oscar', 'Pablo',
      'Rafael', 'Roberto', 'Rodrigo', 'Sebastián', 'Simón', 'Tomás', 'Víctor', 'William', 'Andrés', 'Javier',
    ],
    last: [
      'Galán', 'Barrientos', 'Caballero', 'Díaz', 'Echeverri', 'Flores', 'González', 'Hernández', 'Ibáñez', 'Jaramillo',
      'Kovalik', 'López', 'Montoya', 'Nieto', 'Ospina', 'Pacheco', 'Quintero', 'Rincón', 'Sánchez', 'Torres',
      'Uribe', 'Valencia', 'Wilches', 'Yepes', 'Zapata', 'Acevedo', 'Betancourt', 'Cortés', 'Duque', 'Franco',
    ],
  },
  MEX: {
    first: [
      'Santiago', 'Daniel', 'Rodrigo', 'Carlos', 'Alejandro', 'Diego', 'Eduardo', 'Felipe', 'Gerardo', 'Héctor',
      'Ignacio', 'Javier', 'Kevin', 'Luis', 'Marcos', 'Néstor', 'Oscar', 'Pablo', 'Rafael', 'Sergio',
      'Tomás', 'Ulises', 'Víctor', 'William', 'Xavier', 'Andrés', 'Bernardo', 'Cristián', 'Fernando', 'Gustavo',
    ],
    last: [
      'González', 'Hernández', 'García', 'Martínez', 'López', 'Rodríguez', 'Ramírez', 'Torres', 'Flores', 'Chávez',
      'Morales', 'Jiménez', 'Vázquez', 'Ortiz', 'Reyes', 'Castro', 'Ruiz', 'Gutiérrez', 'Sánchez', 'Díaz',
      'Mendoza', 'Fuentes', 'Luna', 'Cruz', 'Medina', 'Suárez', 'Delgado', 'Peña', 'Núñez', 'Muñoz',
    ],
  },
  // ── Ásia ─────────────────────────────────────────────────────
  JPN: {
    first: [
      'Daichi', 'Haruto', 'Kenji', 'Kohei', 'Makoto', 'Naoki', 'Ryu', 'Shota', 'Takeshi', 'Yuki',
      'Atsushi', 'Daisuke', 'Eiji', 'Fumiya', 'Genta', 'Hideki', 'Issei', 'Junpei', 'Kazuma', 'Minoru',
      'Norio', 'Osamu', 'Ren', 'Shinya', 'Taku', 'Tatsuki', 'Tomoki', 'Yasuhiro', 'Yuichi', 'Yuji',
      'Akito', 'Hayato', 'Ibuki', 'Jiro', 'Masaya', 'Ryusei',
    ],
    last: [
      'Yamamoto', 'Nakamura', 'Suzuki', 'Tanaka', 'Watanabe', 'Inoue', 'Kimura', 'Kobayashi', 'Sato', 'Ito',
      'Kato', 'Yamada', 'Hayashi', 'Matsumoto', 'Ishikawa', 'Ogawa', 'Nomura', 'Yamaguchi', 'Fujita', 'Takahashi',
      'Abe', 'Ikeda', 'Okamoto', 'Shimizu', 'Nishimura', 'Maeda', 'Fujii', 'Mori', 'Hasegawa', 'Narita',
      'Aoki', 'Goto', 'Honda', 'Kaneko', 'Saito', 'Tsuda',
    ],
  },
  KOR: {
    first: [
      'Junho', 'Minho', 'Sehun', 'Seungwoo', 'Taehyun', 'Wonseok', 'Yongjun', 'Jihoon', 'Dongwoo', 'Hyunwoo',
      'Chanhyuk', 'Donghyun', 'Euijin', 'Geonhee', 'Hanjun', 'Inseo', 'Jaehyun', 'Kangmin', 'Leejun', 'Minjae',
      'Namhoon', 'Ohyeon', 'Piljun', 'Raehyun', 'Sanghoon', 'Taekyung', 'Uhyeon', 'Vino', 'Woobin', 'Yongheon',
      'Bomin', 'Doyeon', 'Ikjun', 'Jaejun', 'Kyungwoo', 'Seokjun',
    ],
    last: [
      'Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim',
      'Han', 'Oh', 'Shin', 'Bae', 'Kwon', 'Ahn', 'Son', 'Yang', 'Jeon', 'Moon',
      'Seo', 'Ryu', 'Nam', 'Hwang', 'Ko', 'Baek', 'Pyo', 'Im', 'Shim', 'Ma',
      'Gong', 'Hong', 'Jeong', 'Ku', 'Min', 'Seong',
    ],
  },
  CHN: {
    first: [
      'Chen', 'Fang', 'Hao', 'Jian', 'Lei', 'Ming', 'Peng', 'Qiang', 'Wei', 'Xin',
      'Chao', 'Dong', 'Gang', 'Guang', 'Hai', 'Jianguo', 'Kai', 'Liang', 'Long', 'Meng',
      'Nan', 'Pu', 'Qi', 'Ren', 'Sheng', 'Tao', 'Wang', 'Xiao', 'Yan', 'Zhen',
      'Bo', 'Da', 'Feng', 'Han', 'Jie', 'Kun',
    ],
    last: [
      'Wang', 'Li', 'Zhang', 'Liu', 'Chen', 'Yang', 'Zhao', 'Huang', 'Zhou', 'Wu',
      'Sun', 'Ma', 'Zhu', 'Hu', 'Guo', 'He', 'Lin', 'Gao', 'Luo', 'Zheng',
      'Xie', 'Tang', 'Cao', 'Xu', 'Pan', 'Deng', 'Cheng', 'Song', 'Feng', 'Lu',
      'Cai', 'Han', 'Jiang', 'Meng', 'Qin', 'Shen',
    ],
  },
  IND: {
    first: [
      'Rohan', 'Sumit', 'Yuki', 'Prajnesh', 'Ramkumar', 'Vishnu', 'Arjun', 'Dev', 'Firoz', 'Hari',
      'Inder', 'Jay', 'Karan', 'Lakshit', 'Manish', 'Navdeep', 'Om', 'Prakash', 'Rahul', 'Sai',
      'Tanmay', 'Udit', 'Vedant', 'Waman', 'Xander', 'Yogesh', 'Zaid', 'Aakash', 'Bharat', 'Chetan',
    ],
    last: [
      'Bopanna', 'Nagal', 'Gunneswaran', 'Ramkumar', 'Myneni', 'Sharma', 'Singh', 'Patel', 'Kumar', 'Gupta',
      'Reddy', 'Verma', 'Joshi', 'Nair', 'Iyer', 'Mehta', 'Kapoor', 'Malhotra', 'Chaudhary', 'Pandey',
      'Tiwari', 'Rao', 'Krishnan', 'Pillai', 'Menon', 'Rajan', 'Suresh', 'Vikram', 'Anand', 'Balaji',
    ],
  },
  // ── África ───────────────────────────────────────────────────
  RSA: {
    first: [
      'Sipho', 'Thabo', 'Mandla', 'Bongani', 'Siyanda', 'Lwazi', 'Khaya', 'Sifiso', 'Mthokozisi', 'Sandile',
      'Ayanda', 'Banele', 'Dumisani', 'Ethan', 'Fanele', 'Graeme', 'Hein', 'Ivan', 'Jurgen', 'Kevin',
      'Lindiwe', 'Mpho', 'Nkosi', 'Olwethu', 'Phiwayinkosi', 'Rory', 'Sabelo', 'Thandolwethu', 'Ulrich', 'Vusi',
    ],
    last: [
      'Dlamini', 'Khumalo', 'Mthembu', 'Ndlovu', 'Nkosi', 'Sibiya', 'Zulu', 'Mkhize', 'Ntuli', 'Cele',
      'Anderson', 'Botha', 'Claassen', 'De Villiers', 'Ellis', 'Fourie', 'Groenewald', 'Hattingh', 'Jansen', 'Kotze',
      'Louw', 'Myburgh', 'Nel', 'Oosthuizen', 'Pretorius', 'Roberts', 'Steyn', 'Thomas', 'Van der Merwe', 'Viljoen',
    ],
  },
  EGY: {
    first: [
      'Ahmed', 'Ali', 'Hassan', 'Karim', 'Mohamed', 'Omar', 'Samir', 'Tarek', 'Walid', 'Youssef',
      'Amr', 'Bassem', 'Dalia', 'Ehab', 'Fadi', 'Gamal', 'Hani', 'Ibrahim', 'Khaled', 'Louay',
      'Mahmoud', 'Nader', 'Osama', 'Rafik', 'Sherif', 'Tamer', 'Wael', 'Yasser', 'Ziad', 'Adel',
    ],
    last: [
      'Ibrahim', 'Hassan', 'Ali', 'Khalil', 'Farouk', 'Naguib', 'Rashid', 'Saleh', 'Mansour', 'Aziz',
      'Abdallah', 'Badr', 'Darwish', 'Elewa', 'Farag', 'Gaber', 'Hamada', 'Ismail', 'Kamel', 'Lotfi',
      'Mostafa', 'Nasser', 'Osman', 'Ramadan', 'Sabry', 'Tawfik', 'Wahba', 'Yousry', 'Zaki', 'Abou',
    ],
  },
  MAR: {
    first: [
      'Younes', 'Mehdi', 'Amine', 'Yassine', 'Khalid', 'Omar', 'Hassan', 'Karim', 'Abdou', 'Bilal',
      'Driss', 'Fouad', 'Ghali', 'Hamid', 'Imad', 'Jawad', 'Larbi', 'Mehdi', 'Nassim', 'Othmane',
      'Rabii', 'Saad', 'Tariq', 'Wissam', 'Youssef', 'Zakaria', 'Adil', 'Brahim', 'Chakib', 'Elias',
    ],
    last: [
      'Benchetrit', 'El Aynaoui', 'Arazi', 'Benneteau', 'Alami', 'Aouad', 'Azzedine', 'Berrada', 'Cherkaoui', 'Doukkali',
      'Ennassiri', 'Fassi', 'Guediri', 'Hassani', 'Idrissi', 'Jalal', 'Khamali', 'Lahlou', 'Meziane', 'Najah',
      'Oukacha', 'Rachidi', 'Sebbar', 'Touil', 'Zouiten', 'Amarir', 'Benali', 'Choukri', 'Darhem', 'Ennouri',
    ],
  },
  // ── Oceania ───────────────────────────────────────────────────
  AUS: {
    first: [
      'Callum', 'Damian', 'Flynn', 'Hugh', 'Jack', 'Lachlan', 'Noah', 'Riley', 'Ryan', 'Zac',
      'Alex', 'Ben', 'Charlie', 'Dave', 'Ethan', 'Finn', 'Hamish', 'Ian', 'Jordan', 'Kyle',
      'Liam', 'Matt', 'Nathan', 'Oli', 'Patrick', 'Quinn', 'Sam', 'Tristan', 'William', 'Xavier',
      'Aaron', 'Brad', 'Curtis', 'Dylan', 'Evan', 'Gus',
    ],
    last: [
      'Smith', 'Jones', 'Williams', 'Taylor', 'Brown', 'Wilson', 'Davis', 'Martin', 'Cooper', 'Anderson',
      'Thompson', 'White', 'Harris', 'Jackson', 'Clark', 'Lewis', 'Robinson', 'Walker', 'Young', 'Hill',
      'Kyrgios', 'Tomljanovic', 'Millman', 'Kokkinakis', 'Bolt', 'Duckworth', 'Hijikata', 'Purcell', 'Saville', 'Vukic',
      'Bond', 'Fitzgerald', 'Hutchison', 'Maxwell', 'Nichols', 'Piper',
    ],
  },
  NZL: {
    first: [
      'Marcus', 'Michael', 'Finn', 'Liam', 'Noah', 'Oliver', 'Jack', 'James', 'William', 'Lucas',
      'Ethan', 'Charlie', 'Isaac', 'Henry', 'Ben', 'Sam', 'Josh', 'Zac', 'Alex', 'Ryan',
      'Daniel', 'Caleb', 'Nathan', 'Dylan', 'Connor', 'Tyler', 'Jake', 'Jordan', 'Aiden', 'Brody',
    ],
    last: [
      'Daniell', 'Venus', 'Murray', 'Smith', 'Jones', 'Brown', 'Wilson', 'Taylor', 'Martin', 'Thompson',
      'Walker', 'White', 'Harris', 'Clark', 'Lewis', 'Robinson', 'Anderson', 'Davis', 'Cooper', 'Hill',
      'Campbell', 'Scott', 'Morrison', 'Sullivan', 'Barnes', 'Collins', 'Robertson', 'Marshall', 'Owen', 'Richards',
    ],
  },
  // Default (multinacional / genérico)
  DEFAULT: {
    first: [
      'Adrian', 'Bruno', 'Carlos', 'David', 'Emil', 'Fabio', 'George', 'Hassan', 'Ivan', 'James',
      'Kevin', 'Luca', 'Marco', 'Nathan', 'Omar', 'Pablo', 'Rafael', 'Stefan', 'Tomás', 'Victor',
      'Alexis', 'Bart', 'Christos', 'Danilo', 'Emir', 'Freddy', 'Gustav', 'Hamid', 'Igor', 'Jovan',
    ],
    last: [
      'Costa', 'Diallo', 'Evans', 'Foster', 'Grant', 'Hassan', 'Ibrahim', 'Joao', 'Klein', 'Lopez',
      'Mendez', 'Nair', 'Ortega', 'Pinto', 'Quinn', 'Rios', 'Silva', 'Torres', 'Ueda', 'Vieira',
      'Wolff', 'Xu', 'Yilmaz', 'Zanetti', 'Abreu', 'Berg', 'Cruz', 'Dua', 'Elan', 'Ferrer',
    ],
  },
};

const ALL_NATIONALITIES = Object.keys(NAME_POOLS).filter(k => k !== 'DEFAULT');

// Distribuição de probabilidade por nacionalidade (influenciada pelo circuito real)
const NATIONALITY_WEIGHTS = {
  // Top tier — países com maior representação histórica e atual
  ESP: 8, ITA: 7, FRA: 7, GER: 6, SRB: 6, AUS: 6, USA: 6,
  // Alta presença
  BRA: 5, ARG: 5, RUS: 5, JPN: 4, CAN: 4, FRA: 4,
  // Presença consistente
  KOR: 3, CHN: 3, SWE: 3, NOR: 3, CHE: 3, CRO: 3,
  // Moderada
  POR: 2, POL: 2, GRE: 2, DEN: 2, AUT: 2, UKR: 2, RSA: 2,
  // Emergente / menor
  CZE: 2, BEL: 2, HUN: 2, CHI: 2, COL: 2, MEX: 2,
  // Menor representação
  EGY: 1, MAR: 1, IND: 1, NZL: 1, FIN: 1,
};

function pickNationality() {
  const items = ALL_NATIONALITIES.map(id => ({ id, weight: NATIONALITY_WEIGHTS[id] ?? 1 }));
  return weightedRandom(items);
}

function generateName(nationality) {
  const pool = NAME_POOLS[nationality] ?? NAME_POOLS.DEFAULT;
  const first = pool.first[randInt(0, pool.first.length - 1)];
  const last  = pool.last [randInt(0, pool.last.length  - 1)];
  return { firstName: first, lastName: last, fullName: `${first} ${last}` };
}


// ═══════════════════════════════════════════════════════════════════
// NICKNAMES PROCEDURAIS
// ═══════════════════════════════════════════════════════════════════

// Adjetivos e substantivos para composição de nicknames
const _NAT_WORDS = {
  ESP: ['Spanish', 'Iberian', 'Castilian'],
  ITA: ['Italian', 'Roman', 'Sicilian'],
  FRA: ['French', 'Gallic', 'Parisian'],
  GER: ['German', 'Teutonic', 'Bavarian'],
  RUS: ['Russian', 'Siberian', 'Moscow'],
  SRB: ['Serbian', 'Balkan', 'Belgrade'],
  CRO: ['Croatian', 'Adriatic', 'Zagreb'],
  BRA: ['Brazilian', 'Carioca', 'Samba'],
  ARG: ['Argentine', 'Pampas', 'Buenos Aires'],
  USA: ['American', 'All-American', 'Stars and Stripes'],
  AUS: ['Australian', 'Outback', 'Southern Cross'],
  JPN: ['Japanese', 'Samurai', 'Tokyo'],
  KOR: ['Korean', 'Seoul', 'Tiger'],
  CHN: ['Chinese', 'Dragon', 'Eastern'],
  SWE: ['Swedish', 'Nordic', 'Viking'],
  NOR: ['Norwegian', 'Norse', 'Fjord'],
  CHE: ['Swiss', 'Alpine', 'Geneva'],
  CAN: ['Canadian', 'Northern', 'Maple'],
  DEFAULT: ['Grand', 'Great', 'Ultimate'],
};

const _BEASTS   = ['Bull', 'Tiger', 'Lion', 'Shark', 'Hawk', 'Wolf', 'Bear', 'Panther', 'Cobra', 'Eagle', 'Falcon', 'Viper', 'Jaguar', 'Rhino', 'Stallion'];
const _WEAPONS  = ['Hammer', 'Blade', 'Cannon', 'Missile', 'Torpedo', 'Thunderbolt', 'Axe', 'Spear', 'Arrow', 'Scythe', 'Saber', 'Mace', 'Rocket', 'Bolt', 'Whip'];
const _EPITHETS = ['Destroyer', 'Annihilator', 'Conqueror', 'Dominator', 'Predator', 'Enforcer', 'Executioner', 'Avenger', 'Punisher', 'Gladiator', 'Warrior', 'Champion', 'Hunter', 'Slayer', 'Crusher'];
const _MYSTERY  = ['Phantom', 'Ghost', 'Shadow', 'Specter', 'Mirage', 'Storm', 'Tempest', 'Cyclone', 'Inferno', 'Blizzard', 'Thunder', 'Lightning', 'Eclipse', 'Vortex', 'Tornado'];
const _ADJECTIVES = ['Silent', 'Ice-Cold', 'Relentless', 'Fearless', 'Unstoppable', 'Untouchable', 'Electric', 'Blazing', 'Iron', 'Steel', 'Golden', 'Savage', 'Lethal', 'Ruthless', 'Merciless'];

function _pick(arr) { return arr[randInt(0, arr.length - 1)]; }
function _natWord(nat) {
  const pool = _NAT_WORDS[nat] ?? _NAT_WORDS.DEFAULT;
  return _pick(pool);
}

const NICKNAME_TEMPLATES = [
  // ── Baseados no sobrenome ────────────────────────────────────
  n => `The ${n.lastName}`,
  n => `${n.lastName} the ${_pick(['Great', 'Magnificent', 'Ruthless', 'Unstoppable', 'Relentless', 'Invincible'])}`,
  n => `${n.lastName} Express`,
  n => `The ${n.lastName} Machine`,
  n => `Big ${n.lastName}`,
  n => `${n.lastName} the ${_pick(_BEASTS)}`,
  n => `${n.lastName} ${_pick(_MYSTERY)}`,

  // ── Baseados no primeiro nome ────────────────────────────────
  n => `El ${n.firstName}`,
  n => `Iron ${n.firstName}`,
  n => `${n.firstName} the Great`,
  n => `Wild ${n.firstName}`,
  n => `Mighty ${n.firstName}`,
  n => `${n.firstName} the ${_pick(_EPITHETS)}`,
  n => `King ${n.firstName}`,
  n => `Saint ${n.firstName}`,

  // ── "The" + substantivo ──────────────────────────────────────
  () => `The ${_pick(_EPITHETS)}`,
  () => `The ${_pick(_MYSTERY)}`,
  () => `The ${_pick(_BEASTS)}`,
  () => `The ${_pick(_WEAPONS)}`,
  () => `The ${_pick(['Machine', 'Wall', 'Artist', 'Surgeon', 'Wizard', 'Maestro', 'Virtuoso', 'Magician', 'Architect', 'Professor'])}`,
  () => `The ${_pick(['Ice Man', 'Hot Rod', 'Comeback Kid', 'Dark Horse', 'Wild Card', 'Ace', 'Hitman', 'Sniper', 'Surgeon', 'Maestro'])}`,

  // ── Adjetivo + Substantivo ───────────────────────────────────
  () => `${_pick(_ADJECTIVES)} ${_pick(_BEASTS)}`,
  () => `${_pick(_ADJECTIVES)} ${_pick(['Machine', 'Storm', 'Force', 'Strike', 'Shot', 'Blade', 'Fist', 'Hand', 'Wall', 'Eye'])}`,
  () => `${_pick(['Raging', 'Blazing', 'Frozen', 'Electric', 'Thunder', 'Shadow', 'Iron', 'Stone', 'Dark', 'Bright'])} ${_pick(_BEASTS)}`,

  // ── Nacionais / geográficos ──────────────────────────────────
  n => `The ${_natWord(n.nationality)} ${_pick(_BEASTS)}`,
  n => `The ${_natWord(n.nationality)} ${_pick(_WEAPONS)}`,
  n => `The ${_natWord(n.nationality)} ${_pick(['Warrior', 'Champion', 'Gladiator', 'Knight', 'Legend', 'Titan', 'Colossus', 'Sentinel'])}`,
  n => `${_natWord(n.nationality)} ${_pick(['Fire', 'Ice', 'Steel', 'Thunder', 'Storm', 'Gold', 'Iron', 'Power'])}`,

  // ── Nomes compostos / apelidos curtos ───────────────────────
  n => `${n.firstName.slice(0, 3).toUpperCase()}`,
  n => n.firstName.length > 6 ? `${n.firstName.slice(0, 4)}` : `${n.firstName}${_pick(['y', 'inho', 'ito', 'ie'])}`,
  n => `${n.lastName.slice(0, 4).toUpperCase()}`,
  n => `${n.firstName[0]}${n.lastName.slice(0, 4)}`.toLowerCase().replace(/^./, c => c.toUpperCase()),

  // ── Solo words ───────────────────────────────────────────────
  () => _pick(['Thunderbolt', 'Avalanche', 'Blitzkrieg', 'Maelstrom', 'Juggernaut', 'Behemoth', 'Colossus', 'Leviathan', 'Goliath', 'Titan']),
  () => _pick(['Whirlwind', 'Hurricane', 'Monsoon', 'Firestorm', 'Frostbite', 'Shockwave', 'Flashpoint', 'Overdrive', 'Afterburn', 'Overdrive']),
  () => _pick(['Phantom', 'Specter', 'Mirage', 'Wraith', 'Revenant', 'Nemesis', 'Poltergeist', 'Banshee', 'Shade', 'Omen']),
  () => _pick(['Nighthawk', 'Thunderhawk', 'Starhawk', 'Firehawk', 'Ironhawk', 'Goldhawk', 'Shadowhawk', 'Icehawk', 'Bloodhawk', 'Steelhawk']),
  () => _pick(['Caliber', 'Voltage', 'Voltage', 'Pressure', 'Magnitude', 'Frequency', 'Amplitude', 'Velocity', 'Momentum', 'Gravity']),

  // ── Inspirados em tênis ──────────────────────────────────────
  () => `${_pick(['Ace', 'Deuce', 'Match Point', 'Break Point', 'Game Set', 'Grand Slam', 'Wildcard', 'Seed', 'Serve King', 'Net Lord'])}`,
  n => `${n.firstName} '${_pick(['Ace', 'Fire', 'Storm', 'Force', 'Flash', 'Blaze', 'Bomb', 'Bolt', 'Iron', 'Gold'])}'`,
  n => `${n.firstName} "${_pick(['The Serve', 'The Wall', 'The Rocket', 'The Hammer', 'The Surgeon', 'The Maestro'])}" ${n.lastName}`,
  () => `${_pick(['Baseline', 'Net', 'Service', 'Return', 'Volley', 'Smash', 'Drop Shot', 'Lob'])} ${_pick(['King', 'God', 'Master', 'Lord', 'Wizard', 'Genius', 'Boss', 'Sultan'])}`,

  // ── Hiperbólicos / dramáticos ────────────────────────────────
  n => `${n.lastName}, The ${_pick(['Legend', 'Myth', 'Phenomenon', 'Prodigy', 'Sensation', 'Revelation', 'Anomaly', 'Freak', 'Wonder', 'Marvel'])}`,
  () => `The ${_pick(['One', 'Only', 'Chosen One', 'Last One Standing', 'Real Deal', 'Genuine Article', 'Full Package', 'Complete Player'])}`,
  () => `${_pick(['Alpha', 'Omega', 'Prime', 'Ultimate', 'Supreme', 'Absolute', 'Total', 'Pure'])} ${_pick(_BEASTS)}`,
  () => `${_pick(['El Matador', 'El Toro', 'El Diablo', 'El Furia', 'El Maestro', 'El Cañon', 'El Rayo', 'El Tren'])}`,
  () => `${_pick(['Il Cannone', 'Il Leone', 'Il Falco', 'Il Gladiatore', 'Il Maestro', 'Il Professore', 'Il Mago', 'Il Campione'])}`,
  () => `${_pick(['Le Canon', 'Le Lion', 'Le Requin', 'Le Fantôme', 'Le Maestro', 'Le Sabreur', 'Le Phénomène', 'Le Génie'])}`,
  () => `${_pick(['Der Hammer', 'Der Blitz', 'Der Meister', 'Der Tiger', 'Der Kanone', 'Der Adler', 'Der Sturm', 'Der Krieg'])}`,
  () => `${_pick(['O Canhão', 'O Leão', 'O Tubarão', 'O Furacão', 'O Maestro', 'O Predador', 'O Touro', 'O Monstro'])}`,
];

function generateNickname(nameObj) {
  const tmpl = NICKNAME_TEMPLATES[randInt(0, NICKNAME_TEMPLATES.length - 1)];
  return tmpl(nameObj);
}


// ═══════════════════════════════════════════════════════════════════
// BIOS PROCEDURAIS
// ═══════════════════════════════════════════════════════════════════

const BIO_FRAGMENTS = {
  origin: [
    n => `${n.firstName} ${n.lastName} começou a jogar tênis aos ${randInt(5, 9)} anos.`,
    n => `Nascido em família sem tradição no esporte, ${n.lastName} descobriu o tênis por acaso.`,
    n => `Filho de ex-atleta, ${n.firstName} cresceu com uma raquete nas mãos.`,
    n => `${n.lastName} foi identificado como talento aos ${randInt(10, 13)} anos por um olheiro.`,
  ],
  style: {
    AGG_BASELINER:  () => 'O forehand e o golpe de assinatura -- pesado, com topspin absurdo.',
    CTR_PUNCHER:    () => 'Nao joga bonito, joga certo. Cada erro alheio e ponto seu.',
    ALL_COURT:      () => 'Adapta o jogo a qualquer superficie com facilidade rara.',
    SRV_VOL:        () => 'Saque + subida imediata. Encurta o ponto ao maximo.',
    BIG_SERVER:     () => 'O saque e a arma principal -- rapido, preciso e imprevisivel.',
    RETRIEVER:      () => 'Parece impossivel de passar. Devolve tudo com paciencia absoluta.',
    TAKEALLRISK:    () => 'Joga no limite. Drop shots, passings, winners impossiveis.',
    GRINDER:        () => 'Stamina sobre-humana. Desgasta ate o ultimo golpe do match.',
    PWR_BASE:       () => 'Forca bruta de ambos os lados. Forehand e backhand sao pancadas.',
    TACT_TEC:       () => 'Precisao cirurgica. Cada bola tem destino calculado.',
    NET_SPEC:       () => 'Constroi o ponto para fechar na rede. Volleys de elite.',
    ADPT_TAC:       () => 'Muda o game plan em campo. Le o jogo como poucos.',
  },
  personality: [
    () => 'Disciplinado e metódico, raramente perde o foco.',
    () => 'Explosivo dentro e fora de quadra — nunca previsível.',
    () => 'Quieto nos bastidores, feroz nos momentos decisivos.',
    () => 'Adora a pressão. Joga melhor quando o placar está contra.',
    () => 'Técnico ao extremo, busca o ponto perfeito a cada rally.',
  ],
};

function generateBio(nameObj, styleId) {
  const origin = BIO_FRAGMENTS.origin[randInt(0, BIO_FRAGMENTS.origin.length - 1)](nameObj);
  const style  = (BIO_FRAGMENTS.style[styleId] ?? BIO_FRAGMENTS.style['ALL_COURT'])();
  const pers   = BIO_FRAGMENTS.personality[randInt(0, BIO_FRAGMENTS.personality.length - 1)]();
  return `${origin} ${style} ${pers}`;
}


// ═══════════════════════════════════════════════════════════════════
// GERAÇÃO DE ATRIBUTOS
// ═══════════════════════════════════════════════════════════════════

/**
 * Atributos em três camadas por estilo — reflete especialização real do jogador.
 *
 * CORE    → atributos que definem o estilo. Partem MUITO mais altos.
 *           Um BIG_SERVER jovem já tem saque acima da média — é o que o levou ao profissional.
 *
 * SUPPORT → atributos que complementam o estilo. Razoáveis — não são prioridade total.
 *           Ex: consistencia de um AGG_BASELINER — precisa de alguma, mas não é foco.
 *
 * WEAK    → atributos opostos ao estilo. Partem deliberadamente baixos.
 *           Um RETRIEVER raramente treina o saque. Um BIG_SERVER ignora o topspin.
 *           Esses atributos PODEM crescer na carreira (com técnico certo), mas partem fracos.
 */
const STYLE_ATTR_TIERS = {
  AGG_BASELINER: {
    core:    ['fhPotencia', 'topspin', 'explosividade', 'visaoTatica', 'fhControle'],
    support: ['velocidade', 'resistencia', 'mentalidade', 'saque'],
    weak:    ['volley', 'smash', 'slice', 'regularidade'],
  },
  CTR_PUNCHER: {
    core:    ['bhControle', 'fhControle', 'resistencia', 'slice', 'leitura', 'devolucao', 'regularidade'],
    support: ['velocidade', 'topspin', 'mentalidade', 'saque'],
    weak:    ['saqueForca', 'visaoTatica', 'volley', 'smash'],
  },
  ALL_COURT: {
    core:    ['fhControle', 'bhControle', 'saquePrecisao', 'mentalidade', 'leitura', 'devolucao'],
    support: ['fhPotencia', 'bhPotencia', 'velocidade', 'slice', 'topspin', 'volley', 'regularidade'],
    weak:    [],  // ALL_COURT é equilibrado — poucos fracos
  },
  SRV_VOL: {
    core:    ['saqueForca', 'saquePrecisao', 'volley', 'smash', 'explosividade', 'mentalidade'],
    support: ['fhPotencia', 'visaoTatica', 'leitura'],
    weak:    ['topspin', 'resistencia', 'regularidade'],
  },
  BIG_SERVER: {
    core:    ['saqueForca', 'saquePrecisao', 'fhPotencia', 'explosividade', 'mentalidade'],
    support: ['smash', 'volley', 'visaoTatica', 'velocidade'],
    weak:    ['topspin', 'bhControle', 'regularidade', 'defesa'],
  },
  RETRIEVER: {
    core:    ['resistencia', 'defesa', 'velocidade', 'bhControle', 'fhControle', 'devolucao', 'regularidade'],
    support: ['mentalidade', 'leitura', 'slice'],
    weak:    ['saqueForca', 'fhPotencia', 'visaoTatica', 'smash'],
  },
  TAKEALLRISK: {
    core:    ['visaoTatica', 'slice', 'fhPotencia', 'bhPotencia', 'leitura', 'explosividade'],
    support: ['velocidade', 'topspin', 'saque'],
    weak:    ['resistencia', 'bhControle', 'regularidade', 'recuperacao'],
  },
  GRINDER: {
    core:    ['resistencia', 'defesa', 'bhControle', 'topspin', 'regularidade'],
    support: ['velocidade', 'slice', 'leitura', 'mentalidade'],
    weak:    ['saqueForca', 'visaoTatica', 'smash', 'fhPotencia'],
  },
  PWR_BASE: {
    core:    ['fhPotencia', 'bhPotencia', 'topspin', 'explosividade', 'visaoTatica'],
    support: ['fhControle', 'velocidade', 'saqueForca', 'mentalidade'],
    weak:    ['volley', 'smash', 'slice', 'regularidade'],
  },
  TACT_TEC: {
    core:    ['slice', 'leitura', 'visaoTatica', 'adaptacao', 'saquePrecisao', 'bhControle'],
    support: ['regularidade', 'devolucao', 'volley', 'recuperacao'],
    weak:    ['saqueForca', 'fhPotencia', 'smash'],
  },
  NET_SPEC: {
    core:    ['volley', 'smash', 'saqueForca', 'saquePrecisao', 'explosividade', 'mentalidade'],
    support: ['leitura', 'slice', 'velocidade'],
    weak:    ['topspin', 'resistencia', 'regularidade'],
  },
  ADPT_TAC: {
    core:    ['leitura', 'visaoTatica', 'adaptacao', 'mentalidade', 'fhControle', 'bhControle', 'devolucao'],
    support: ['velocidade', 'slice', 'topspin', 'saquePrecisao', 'recuperacao'],
    weak:    [],  // ADPT_TAC se adapta — sem fraquezas forçadas
  },
};

/** Todos os attrKeys do jogo v4 — 21 atributos */
const ALL_ATTR_KEYS = [
  'velocidade', 'explosividade', 'resistencia', 'defesa',
  'fhPotencia', 'fhControle', 'bhPotencia', 'bhControle', 'topspin', 'slice',
  'saqueForca', 'saquePrecisao', 'devolucao',
  'volley', 'smash',
  'leitura', 'visaoTatica',
  'mentalidade', 'regularidade', 'recuperacao', 'adaptacao',
];

/**
 * Range de % do teto por tier de potencial na geração.
 * GERACIONAL/LENDA: prodigies nascem mais prontos (60-75%)
 * ELITE/CAMPEAO:    variância maior — alguns chegam crus (45-65%)
 * COMUM:            profissional mediano jovem (40-60%)
 * ABAIXO_DA_MEDIA:  chegam verdes mesmo (35-55%)
 */
const START_FACTOR_RANGE = {
  GERACIONAL:      [0.60, 0.75],
  LENDA:           [0.60, 0.75],
  ELITE:           [0.45, 0.65],
  CAMPEAO:         [0.45, 0.65],
  COMUM:           [0.40, 0.60],
  ABAIXO_DA_MEDIA: [0.35, 0.55],
};

/**
 * Gera os atributos de um newgen com base no potencial e estilo.
 *
 * Sistema de três camadas:
 *   CORE    — atributos centrais do estilo: base + boost grande (12–22 pts)
 *   SUPPORT — atributos de suporte: base + boost médio (4–10 pts)
 *   WEAK    — atributos opostos: base − penalidade (6–15 pts)
 *
 * Isso cria jogadores com identidade clara desde o início:
 *   - Um BIG_SERVER jovem já serve bem e bate forte, mas tem volley mediano
 *   - Um RETRIEVER corre e aguenta, mas não vai ganhar em potência de forehand
 *
 * Variância individual mantida (±8 pts) para cada attr ser único.
 */
function generateAttrs(potential, styleId) {
  const cat = getPotentialCategory(potential);
  const ceiling = cat.ovrCeiling;

  // Fator de partida: % do teto varia por tier de potencial
  const [sfMin, sfMax] = START_FACTOR_RANGE[potential] ?? [0.45, 0.65];
  const startFactor = randFloat(sfMin, sfMax);

  // Base média dos atributos (âncora neutra)
  const baseAvg = clamp(Math.round(ceiling * startFactor), 30, 75);

  // Tiers do estilo
  const tiers = STYLE_ATTR_TIERS[styleId] ?? { core: [], support: [], weak: [] };
  const coreSet    = new Set(tiers.core);
  const supportSet = new Set(tiers.support);
  const weakSet    = new Set(tiers.weak);

  // Boosts e penalidades por tier — com variância individual
  // CORE: +12 a +22 pts acima da base (jogador já especializado nessa arma)
  const coreBoost    = randInt(12, 22);
  // SUPPORT: +4 a +10 pts (complementa o estilo, mas não é foco máximo)
  const supportBoost = randInt(4, 10);
  // WEAK: −6 a −15 pts (raramente treinado — ponto fraco real do jogador)
  const weakPenalty  = randInt(6, 15);

  // Variância individual: ±8 pts por atributo
  const variance = 8;

  const attrs = {};
  for (const key of ALL_ATTR_KEYS) {
    const noise = Math.round((Math.random() * 2 - 1) * variance);
    let val;
    if (coreSet.has(key)) {
      val = baseAvg + coreBoost + noise;
    } else if (supportSet.has(key)) {
      val = baseAvg + supportBoost + noise;
    } else if (weakSet.has(key)) {
      val = baseAvg - weakPenalty + noise;
    } else {
      // Neutro (alcance, etc.): base pura
      val = baseAvg + noise;
    }
    attrs[key] = clamp(val, 28, 85); // newgens não partem acima de 85
  }

  // v4: FH e BH gerados separadamente com split de identidade
  // O estilo define qual lado é a arma — small noise individual
  const fhBias = {
    AGG_BASELINER: 6, CTR_PUNCHER: -3, RETRIEVER: -2,
    SRV_VOL: 2, BIG_SERVER: 5, TAKEALLRISK: 7, PWR_BASE: 4,
    GRINDER: 0, ALL_COURT: 0, TACT_TEC: -2, NET_SPEC: 1, ADPT_TAC: 0,
  }[styleId] ?? 0;

  // fhPotencia e bhPotencia já foram gerados pelo loop — ajustamos o bias
  if (attrs.fhPotencia !== undefined && attrs.bhPotencia !== undefined) {
    attrs.fhPotencia = clamp(attrs.fhPotencia + fhBias, 28, 88);
    attrs.bhPotencia = clamp(attrs.bhPotencia - fhBias, 28, 88);
  }
  // fhControle tende a ser ligeiramente mais alto que bhControle para estilos ofensivos
  if (attrs.fhControle !== undefined && attrs.bhControle !== undefined) {
    const ctrlBias = fhBias > 0 ? Math.round(fhBias * 0.4) : 0;
    attrs.fhControle = clamp(attrs.fhControle + ctrlBias, 28, 88);
    attrs.bhControle = clamp(attrs.bhControle - ctrlBias, 28, 88);
  }
  // saqueForca vs saquePrecisao: BIG_SERVER/TAKEALLRISK têm força >> precisão
  if (attrs.saqueForca !== undefined && attrs.saquePrecisao !== undefined) {
    const serveBias = {
      BIG_SERVER: 8, TAKEALLRISK: 6, SRV_VOL: 4,
      RETRIEVER: -5, CTR_PUNCHER: -4,
    }[styleId] ?? 0;
    attrs.saqueForca   = clamp(attrs.saqueForca   + serveBias, 28, 88);
    attrs.saquePrecisao = clamp(attrs.saquePrecisao - serveBias, 28, 88);
  }

  return attrs;
}


// ═══════════════════════════════════════════════════════════════════
// ROLAGEM DE POTENCIAL
// ═══════════════════════════════════════════════════════════════════

function rollPotential(forcePotential) {
  if (forcePotential) return forcePotential;

  const items = Object.values(POTENTIAL_CATEGORIES).map(cat => ({
    id: cat.id,
    weight: cat.rarity,
  }));

  return weightedRandom(items);
}

function rollDevelopmentStyle() {
  const styles = Object.keys(CAREER_ARCS);
  return styles[randInt(0, styles.length - 1)];
}

function rollStyleId(nationality) {
  // Influência por nacionalidade — tendências históricas do circuito
  const NATIONALITY_STYLE_BIAS = {
    // Europa
    ESP: { AGG_BASELINER: 3, CTR_PUNCHER: 3, GRINDER: 2 },
    ITA: { AGG_BASELINER: 2, PWR_BASE: 2, TACT_TEC: 1 },
    FRA: { ALL_COURT: 2, TACT_TEC: 2, TAKEALLRISK: 1 },
    GER: { CTR_PUNCHER: 2, GRINDER: 2, TACT_TEC: 1 },
    AUT: { ALL_COURT: 2, ADPT_TAC: 2 },
    SWE: { GRINDER: 2, ALL_COURT: 2, CTR_PUNCHER: 1 },
    NOR: { BIG_SERVER: 2, SRV_VOL: 1, NET_SPEC: 1 },
    DEN: { GRINDER: 2, BIG_SERVER: 1 },
    CHE: { ALL_COURT: 2, TACT_TEC: 2, ADPT_TAC: 1 },
    BEL: { ALL_COURT: 2, ADPT_TAC: 1 },
    POL: { CTR_PUNCHER: 2, GRINDER: 1 },
    GRE: { CTR_PUNCHER: 2, RETRIEVER: 2 },
    POR: { AGG_BASELINER: 2, GRINDER: 2 },
    RUS: { ALL_COURT: 2, PWR_BASE: 2, SRV_VOL: 1 },
    UKR: { PWR_BASE: 2, AGG_BASELINER: 1 },
    SRB: { CTR_PUNCHER: 2, ALL_COURT: 2, ADPT_TAC: 1 },
    HUN: { ADPT_TAC: 2, CTR_PUNCHER: 1 },
    // Americas
    USA: { BIG_SERVER: 2, SRV_VOL: 1, PWR_BASE: 2, TAKEALLRISK: 1 },
    CAN: { ALL_COURT: 2, ADPT_TAC: 2 },
    BRA: { AGG_BASELINER: 2, TAKEALLRISK: 1, NET_SPEC: 1 },
    ARG: { AGG_BASELINER: 2, CTR_PUNCHER: 2, GRINDER: 2 },
    CHI: { CTR_PUNCHER: 2, GRINDER: 2 },
    COL: { AGG_BASELINER: 2, CTR_PUNCHER: 1 },
    MEX: { AGG_BASELINER: 2, PWR_BASE: 1 },
    PER: { CTR_PUNCHER: 2, RETRIEVER: 1 },
    // Oceania
    AUS: { BIG_SERVER: 2, SRV_VOL: 2, NET_SPEC: 1 },
    NZL: { ALL_COURT: 2, GRINDER: 1 },
    // Asia
    JPN: { TACT_TEC: 3, NET_SPEC: 2, ALL_COURT: 1 },
    KOR: { ADPT_TAC: 2, TACT_TEC: 2, CTR_PUNCHER: 1 },
    CHN: { AGG_BASELINER: 2, GRINDER: 2, PWR_BASE: 1 },
    IND: { GRINDER: 2, ALL_COURT: 1 },
    VIE: { RETRIEVER: 2, CTR_PUNCHER: 1 },
    // Africa / Oriente Medio
    RSA: { PWR_BASE: 2, AGG_BASELINER: 1 },
    GHA: { AGG_BASELINER: 2, PWR_BASE: 1 },
    NGR: { PWR_BASE: 2, TAKEALLRISK: 1 },
    SEN: { PWR_BASE: 2, AGG_BASELINER: 1 },
    MLI: { GRINDER: 2, CTR_PUNCHER: 1 },
    MAR: { CTR_PUNCHER: 2, GRINDER: 2 },
    TUN: { CTR_PUNCHER: 2, TACT_TEC: 1 },
    EGY: { ADPT_TAC: 2, ALL_COURT: 1 },
    UAE: { BIG_SERVER: 2, PWR_BASE: 1 },
  };

  const bias = NATIONALITY_STYLE_BIAS[nationality] ?? {};
  const styleKeys = [
    'AGG_BASELINER', 'CTR_PUNCHER', 'ALL_COURT', 'SRV_VOL', 'BIG_SERVER',
    'RETRIEVER', 'TAKEALLRISK', 'GRINDER', 'PWR_BASE', 'TACT_TEC', 'NET_SPEC', 'ADPT_TAC',
  ];
  const items = styleKeys.map(id => ({ id, weight: 1 + (bias[id] ?? 0) }));
  return weightedRandom(items);
}


// ═══════════════════════════════════════════════════════════════════
// FUNÇÃO PRINCIPAL: generateNewgen
// ═══════════════════════════════════════════════════════════════════

let _newgenCounter = 1000; // IDs únicos para newgens

// ── Pools de Identidade por Estilo ───────────────────────────────
// Define quais golpes assinatura e padrões de rally fazem sentido
// para cada estilo de jogo. Newgens recebem uma atribuição aleatória do pool.
// ── Pools de golpes assinatura por estilo ────────────────────────
// Cada estilo tem dois tiers:
//   primary   → candidatos para pool[0] (PRIMARY, boost total)
//   secondary → candidatos para pool[1] e pool[2] (WEAPON e TENDENCY)
// rollSignatureShots() gera array de 2-3 sem repetição.
//
// Coberta todos os 23 golpes do catálogo atualizado.
const STYLE_SIGNATURE_POOLS = {
  AGG_BASELINER: {
    primary:   ['INSIDE_OUT_FH', 'BANANA_FH', 'TOPSPIN_CROSS', 'RUNNING_FH', 'SHORT_ANGLE_FH'],
    secondary: ['HEAVY_TOPSPIN_CC', 'FLAT_WINNER', 'INSIDE_IN_FH', 'BANANA_BH', 'DTL_BH'],
  },
  CTR_PUNCHER: {
    primary:   ['SLICE_BH', 'DTL_BH', 'BANANA_BH', 'BH_CHIP_RETURN'],
    secondary: ['TOPSPIN_CROSS', 'DROP_SHOT', 'HEAVY_TOPSPIN_CC', 'MOONBALL', 'TOPSPIN_PASS'],
  },
  ALL_COURT: {
    primary:   ['DROP_SHOT', 'DTL_BH', 'SHORT_ANGLE_FH', 'INSIDE_OUT_FH', 'BANANA_BH', 'TOPSPIN_PASS'],
    secondary: ['MOONBALL', 'SLICE_BH', 'LOB_ATTACK', 'VOLLEY_FINISH', 'SWINGING_VOLLEY', 'SLICE_APPROACH'],
  },
  SRV_VOL: {
    primary:   ['BIG_SERVE', 'VOLLEY_FINISH', 'DROP_VOLLEY', 'WIDE_SLICE_SERVE'],
    secondary: ['SWINGING_VOLLEY', 'FLAT_SERVE_T', 'SLICE_APPROACH', 'FLAT_WINNER'],
  },
  BIG_SERVER: {
    primary:   ['BIG_SERVE', 'FLAT_SERVE_T', 'WIDE_SLICE_SERVE'],
    secondary: ['FLAT_WINNER', 'INSIDE_IN_FH', 'INSIDE_OUT_FH', 'RUNNING_FH', 'SWINGING_VOLLEY'],
  },
  RETRIEVER: {
    primary:   ['SLICE_BH', 'MOONBALL', 'BH_CHIP_RETURN', 'HEAVY_TOPSPIN_CC'],
    secondary: ['DROP_SHOT', 'DTL_BH', 'TOPSPIN_PASS', 'SLICE_APPROACH'],
  },
  TAKEALLRISK: {
    primary:   ['SHORT_ANGLE_FH', 'BANANA_FH', 'BANANA_BH', 'RUNNING_FH', 'LOB_ATTACK'],
    secondary: ['FLAT_WINNER', 'DROP_SHOT', 'SWINGING_VOLLEY', 'INSIDE_IN_FH', 'DROP_VOLLEY'],
  },
  GRINDER: {
    primary:   ['TOPSPIN_CROSS', 'DTL_BH', 'HEAVY_TOPSPIN_CC', 'MOONBALL'],
    secondary: ['SLICE_BH', 'DROP_SHOT', 'BH_CHIP_RETURN', 'SLICE_APPROACH', 'TOPSPIN_PASS'],
  },
  PWR_BASE: {
    primary:   ['FLAT_WINNER', 'INSIDE_OUT_FH', 'INSIDE_IN_FH', 'RUNNING_FH', 'BANANA_FH'],
    secondary: ['DTL_BH', 'SHORT_ANGLE_FH', 'TOPSPIN_CROSS', 'SWINGING_VOLLEY'],
  },
  TACT_TEC: {
    primary:   ['DROP_SHOT', 'SLICE_BH', 'SHORT_ANGLE_FH', 'SLICE_APPROACH', 'BH_CHIP_RETURN'],
    secondary: ['MOONBALL', 'TOPSPIN_PASS', 'DROP_VOLLEY', 'DTL_BH', 'INSIDE_OUT_FH'],
  },
  NET_SPEC: {
    primary:   ['VOLLEY_FINISH', 'SWINGING_VOLLEY', 'DROP_VOLLEY', 'DROP_SHOT'],
    secondary: ['SLICE_APPROACH', 'LOB_ATTACK', 'SHORT_ANGLE_FH', 'BIG_SERVE'],
  },
  ADPT_TAC: {
    primary:   ['DROP_SHOT', 'DTL_BH', 'SHORT_ANGLE_FH', 'MOONBALL', 'TOPSPIN_PASS'],
    secondary: ['SLICE_BH', 'BH_CHIP_RETURN', 'INSIDE_OUT_FH', 'TOPSPIN_CROSS', 'SLICE_APPROACH'],
  },
};

const STYLE_PATTERN_POOLS = {
  AGG_BASELINER: ['CROSS_HEAVY', 'AGGRESSIVE_EARLY', 'SHORT_ANGLE_BUILDER', 'DTL_HUNTER'],
  CTR_PUNCHER:   ['DEFENSIVE_BASE', 'DEEP_GRINDER', 'CENTRE_CONTROL', 'RHYTHM_DISRUPTION'],
  ALL_COURT:     ['CENTRE_CONTROL', 'RHYTHM_DISRUPTION', 'SHORT_ANGLE_BUILDER', 'NET_APPROACH', 'DTL_HUNTER'],
  SRV_VOL:       ['SERVE_PLUS_ONE', 'NET_APPROACH', 'AGGRESSIVE_EARLY'],
  BIG_SERVER:    ['SERVE_PLUS_ONE', 'AGGRESSIVE_EARLY', 'CENTRE_CONTROL', 'DTL_HUNTER'],
  RETRIEVER:     ['DEFENSIVE_BASE', 'DEEP_GRINDER', 'CENTRE_CONTROL'],
  TAKEALLRISK:   ['AGGRESSIVE_EARLY', 'SHORT_ANGLE_BUILDER', 'RHYTHM_DISRUPTION', 'DTL_HUNTER'],
  GRINDER:       ['DEEP_GRINDER', 'DEFENSIVE_BASE', 'CENTRE_CONTROL', 'RHYTHM_DISRUPTION'],
  PWR_BASE:      ['AGGRESSIVE_EARLY', 'CROSS_HEAVY', 'DTL_HUNTER', 'SERVE_PLUS_ONE'],
  TACT_TEC:      ['RHYTHM_DISRUPTION', 'CENTRE_CONTROL', 'SHORT_ANGLE_BUILDER', 'NET_APPROACH'],
  NET_SPEC:      ['NET_APPROACH', 'RHYTHM_DISRUPTION', 'SHORT_ANGLE_BUILDER', 'SERVE_PLUS_ONE'],
  ADPT_TAC:      ['CENTRE_CONTROL', 'RHYTHM_DISRUPTION', 'NET_APPROACH', 'SHORT_ANGLE_BUILDER', 'DEFENSIVE_BASE'],
};

// Gera array de 2-3 golpes sem repetição: [primary, weapon, ?tendency]
function rollSignatureShots(styleId) {
  const tiers   = STYLE_SIGNATURE_POOLS[styleId] ?? { primary: SIGNATURE_SHOT_KEYS.slice(0, 6), secondary: SIGNATURE_SHOT_KEYS.slice(6) };
  const picked  = [];
  const used    = new Set();

  // pool[0] — PRIMARY: sorteia do tier primary
  const p0 = tiers.primary[Math.floor(Math.random() * tiers.primary.length)];
  picked.push(p0);
  used.add(p0);

  // pool[1] — WEAPON: sorteia do combined, excluindo já usados
  const combined = [...tiers.primary, ...tiers.secondary].filter(s => !used.has(s));
  if (combined.length > 0) {
    const p1 = combined[Math.floor(Math.random() * combined.length)];
    picked.push(p1);
    used.add(p1);
  }

  // pool[2] — TENDENCY: 70% de chance, só do secondary
  if (Math.random() < 0.70) {
    const secondaryLeft = tiers.secondary.filter(s => !used.has(s));
    if (secondaryLeft.length > 0) {
      const p2 = secondaryLeft[Math.floor(Math.random() * secondaryLeft.length)];
      picked.push(p2);
    }
  }

  return picked; // array de 2 ou 3 elementos
}

function rollRallyPattern(styleId) {
  const pool = STYLE_PATTERN_POOLS[styleId] ?? RALLY_PATTERN_KEYS;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Gera um novo jogador (newgen) para o modo carreira.
 *
 * @param {number} seasonYear — ano atual da temporada
 * @param {object} [options]
 * @param {string} [options.nationality]     — forçar nacionalidade
 * @param {string} [options.forcePotential]  — forçar potencial (para testes)
 * @param {[number,number]} [options.ageRange] — default [15, 19]
 * @returns {object} jogador completo, compatível com NAMED_PLAYERS
 */
export function generateNewgen(seasonYear, options = {}) {
  const {
    nationality: forcedNationality,
    forcePotential,
    ageRange = [15, 19],
  } = options;

  // ── 1. Atributos de identidade ────────────────────────────────
  const nationality = forcedNationality ?? pickNationality();
  const nameObj     = generateName(nationality);
  const age         = randInt(ageRange[0], ageRange[1]);
  const birthYear   = seasonYear - age;

  // ── 2. Arco de carreira e desenvolvimento ─────────────────────
  const potential        = rollPotential(forcePotential);
  const developmentStyle = rollDevelopmentStyle();
  const styleId          = rollStyleId(nationality);
  const arc              = getCareerArc(developmentStyle);

  // peakAge baseado no arc — idade absoluta dentro do range do arc
  const peakAge = randInt(arc.peakAgeRange[0], arc.peakAgeRange[1]);

  // ── 3. Atributos ──────────────────────────────────────────────
  const attrs = generateAttrs(potential, styleId);

  // ── 4. ID único ───────────────────────────────────────────────
  const id = `NEWGEN_${_newgenCounter++}_${nameObj.lastName.toUpperCase().replace(/[^A-Z]/g, '')}`;

  // ── 5. Físico ─────────────────────────────────────────────────
  const height = parseFloat((randFloat(1.75, 2.05)).toFixed(2));
  const weight = randInt(68, 98);

  // ── 6. Montar objeto ──────────────────────────────────────────
  const player = {
    id,
    name:      nameObj.lastName,
    firstName: nameObj.firstName,
    fullName:  nameObj.fullName,
    nickname:  generateNickname({ ...nameObj, nationality }),
    nationality,
    age,
    height,
    weight,
    styleId,

    // Campos de desenvolvimento
    birthYear,
    potential,
    developmentStyle,
    peakAge,
    alcunha: null,  // avaliado abaixo
    _devState: {
      monthsAtPeak:         0,
      lastBreakthrough:     null,
      attrGrowthAccum:      {},
      hadBreakdownRecovery: false,
      ovrTarget:            rollOvrTarget(potential),
    },

    // Texto
    tagline: generateTagline(potential, developmentStyle),
    bio:     generateBio(nameObj, styleId),
    color:   generateColor(potential),

    attrs,
    prefs: generateRandomPrefs(attrs),

    // ── Kits de roupa: 5 visuais aleatórios, rotacionados por torneio ──────
    // activeKitIndex é escolhido aleatoriamente no início de cada torneio.
    kits:           generateKits(id, null, 5),
    activeKitIndex: 0,

    // Identidade individual — signature natural e padrão de rally
    naturalSignature: rollPlayerSignature(styleId, attrs),
    rallyPattern:   rollRallyPattern(styleId),
    signaturePattern: null,  // [SignaturePatterns will be rebuilt separately]

    // Flag para distinguir de jogadores originais
    isNewgen:   true,
    generatedIn: seasonYear,

    // Coaching System — inicializado sem técnico
    coach:        null,
    coachHistory: [],

    // FASE 2 — Forma recente: afeta qualidade, erro e saque no motor de jogo.
    // Distinto de formPoints (macro/ranking) — este é micro (por superfície, por partida).
    recentForm: {
      results:     [],    // [{ won, surface, oppRank, sets }] — últimos 10
      formScore:   0.5,   // 0..1 média ponderada dos results (mais recente = mais peso)
      hotStreak:   0,     // vitórias consecutivas atuais
      coldStreak:  0,     // derrotas consecutivas atuais
      surfaceForm: {},    // { CLAY: float, GRASS: float, HARD: float, INDOOR: float }
    },

    // FASE 4 — Estatísticas históricas por superfície (carreira completa).
    // Distinto de surfaceForm (curto prazo) — este acumula para toda a carreira.
    // Alimenta computeSurfaceIdentity() → player.surfaceIdentity (especialista emergente).
    surfaceStats: {
      CLAY:   { wins: 0, losses: 0, titlesWon: 0 },
      GRASS:  { wins: 0, losses: 0, titlesWon: 0 },
      HARD:   { wins: 0, losses: 0, titlesWon: 0 },
      INDOOR: { wins: 0, losses: 0, titlesWon: 0 },
    },
  };

  // ── 7. Atribuir foto do pool por continente ───────────────────
  // poolState é passado por opções — deve vir do state.newgenImagePool.
  // Se não vier (geração isolada/teste), funciona sem foto.
  if (options._poolState !== undefined) {
    const { photo, poolState: updatedPool } = assignNewgenPhoto(player, options._poolState);
    player.photo = photo;
    options._poolState = updatedPool; // mutação intencional — caller lê de volta
  }

  // ── 8. Avaliar alcunha inicial (raro — apenas talento extremo) ─
  player.alcunha = evaluateAlcunha(player);

  // ── 8. Inicializar sistema DNA de traits ──────────────────────
  initPlayerDNA(player);
  assignTraits(player);

  // ── 9. Gerar preferências de torneio ─────────────────────────
  player.tournamentPreferences = generateTournamentPreferences(player);

  // ── 10. Gerar personalidade off-court ────────────────────────
  player.personality = generatePersonality(player);

  // ── 11. Gerar dados de vida fora da quadra ───────────────────
  player.lifeData     = generateLifeData(player);
  player.lifeEventLog = [];

  return player;
}


// ═══════════════════════════════════════════════════════════════════
// HELPERS DE GERAÇÃO
// ═══════════════════════════════════════════════════════════════════

const TAGLINES_BY_POTENTIAL = {
  GERACIONAL:      [
    'Não nasci para vencer. Nasci para dominar.',
    'O circuito nunca viu nada assim.',
    'Cada ponto é história.',
  ],
  LENDA:           [
    'Títulos não se pedem. Se conquistam.',
    'Meu jogo fala mais alto que qualquer número.',
    'A grandeza é um processo — eu já comecei.',
  ],
  ELITE:           [
    'Cada partida me define um pouco mais.',
    'O topo é o destino. O caminho é meu.',
    'Posso perder uma batalha. Nunca a guerra.',
  ],
  CAMPEAO:         [
    'Não sou favorito. Sou perigo.',
    'Qualquer dia pode ser o grande dia.',
    'Luto por cada ponto.',
  ],
  COMUM:           [
    'Hoje pode ser meu dia.',
    'Cada vitória conta.',
    'O circuito me subestima. Meu erro.',
  ],
  ABAIXO_DA_MEDIA: [
    'Estou aqui para aprender.',
    'Minha vez vai chegar.',
  ],
};

function generateTagline(potential, devStyle) {
  const pool = TAGLINES_BY_POTENTIAL[potential] ?? TAGLINES_BY_POTENTIAL.COMUM;
  return pool[randInt(0, pool.length - 1)];
}

// Cores temáticas por potencial (espelha POTENTIAL_CATEGORIES mas menos saturado para UI)
const COLORS_BY_POTENTIAL = {
  GERACIONAL:      ['#FFD700', '#FFC300', '#FFB700'],
  LENDA:           ['#E8E8E8', '#C8C8C8', '#B8B8D0'],
  ELITE:           ['#E8A838', '#D4941C', '#F0B840'],
  CAMPEAO:         ['#6CB4E4', '#4A9FD4', '#5AAAE0'],
  COMUM:           ['#A0A0A0', '#909090', '#888898'],
  ABAIXO_DA_MEDIA: ['#707070', '#606060', '#686878'],
};

function generateColor(potential) {
  const pool = COLORS_BY_POTENTIAL[potential] ?? COLORS_BY_POTENTIAL.COMUM;
  return pool[randInt(0, pool.length - 1)];
}


// ═══════════════════════════════════════════════════════════════════
// BATCH GENERATION — gerar múltiplos newgens por temporada
// ═══════════════════════════════════════════════════════════════════

/**
 * Gera um lote de newgens para uma temporada.
 * Tipicamente chamado pelo SeasonManager ao virar o ano.
 *
 * @param {number} seasonYear
 * @param {number} [count=6]        — quantos jogadores gerar
 * @param {object} [baseOptions={}] — opções passadas para cada generateNewgen
 * @returns {object[]} array de jogadores
 */
export function generateNewgenBatch(seasonYear, count = 6, baseOptions = {}) {
  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(generateNewgen(seasonYear, baseOptions));
  }
  return result;
}


// ═══════════════════════════════════════════════════════════════════
// UTILITÁRIOS DE INSPEÇÃO
// ═══════════════════════════════════════════════════════════════════

/**
 * Retorna uma string legível com o perfil resumido de um newgen.
 * Útil para debug e testes.
 */
export function describeNewgen(player) {
  return [
    `[${player.id}] ${player.fullName} (${player.nationality}, ${player.age}a)`,
    `  Potencial: ${player.potential} | Arc: ${player.developmentStyle} | Style: ${player.styleId}`,
    `  PeakAge: ${player.peakAge} | BirthYear: ${player.birthYear}`,
    `  Alcunha: ${player.alcunha ?? 'nenhuma'}`,
    `  Tagline: "${player.tagline}"`,
  ].join('\n');
}
