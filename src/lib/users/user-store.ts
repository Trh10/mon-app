// Stockage et gestion des utilisateurs
import fs from 'fs';
import path from 'path';
import { User, CreateUserData, UpdateUserData, USER_LEVELS } from './user-types';

const USERS_FILE = path.join(process.cwd(), 'data', 'users.json');

// Assurer que le répertoire data existe
function ensureDataDirectory() {
  const dataDir = path.dirname(USERS_FILE);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

// Charger les utilisateurs
export function getUsers(): User[] {
  try {
    ensureDataDirectory();
    
    if (!fs.existsSync(USERS_FILE)) {
      // Créer des utilisateurs par défaut
      const defaultUsers: User[] = [
        {
          id: 'user001',
          code: 'ADMIN',
          name: 'Administrateur Système',
          email: 'admin@company.com',
          level: 7,
          levelName: USER_LEVELS[7],
          companyId: 'default-company',
          companyCode: 'COMP-001',
          department: 'IT',
          position: 'Administrateur',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'user002',
          code: 'DG001',
          name: 'Directeur Général',
          email: 'dg@company.com',
          level: 10,
          levelName: USER_LEVELS[10],
          companyId: 'default-company',
          companyCode: 'COMP-001',
          department: 'Direction',
          position: 'Directeur Général',
          isActive: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      fs.writeFileSync(USERS_FILE, JSON.stringify(defaultUsers, null, 2));
      return defaultUsers;
    }
    
    const data = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Erreur lecture utilisateurs:', error);
    return [];
  }
}

// Sauvegarder les utilisateurs
function saveUsers(users: User[]): boolean {
  try {
    ensureDataDirectory();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
    return true;
  } catch (error) {
    console.error('Erreur sauvegarde utilisateurs:', error);
    return false;
  }
}

// Générer un ID unique
function generateUserId(): string {
  return `user_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
}

// Ajouter un utilisateur
export function addUser(userData: CreateUserData): User | null {
  try {
    const users = getUsers();
    
    // Vérifier que le code utilisateur est unique
    if (users.some(user => user.code === userData.code)) {
      throw new Error('Code utilisateur déjà existant');
    }
    
    // Vérifier que l'email est unique
    if (users.some(user => user.email === userData.email)) {
      throw new Error('Email déjà existant');
    }
    
    const newUser: User = {
      id: generateUserId(),
      ...userData,
      levelName: USER_LEVELS[userData.level as keyof typeof USER_LEVELS] || 'Inconnu',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    users.push(newUser);
    
    if (saveUsers(users)) {
      return newUser;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur ajout utilisateur:', error);
    return null;
  }
}

// Mettre à jour un utilisateur
export function updateUser(userId: string, updateData: UpdateUserData): User | null {
  try {
    const users = getUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return null;
    }
    
    const updatedUser = {
      ...users[userIndex],
      ...updateData,
      updatedAt: new Date().toISOString()
    };
    
    // Mettre à jour le nom du niveau si le niveau a changé
    if (updateData.level !== undefined) {
      updatedUser.levelName = USER_LEVELS[updateData.level as keyof typeof USER_LEVELS] || 'Inconnu';
    }
    
    users[userIndex] = updatedUser;
    
    if (saveUsers(users)) {
      return updatedUser;
    }
    
    return null;
  } catch (error) {
    console.error('Erreur mise à jour utilisateur:', error);
    return null;
  }
}

// Supprimer un utilisateur (désactiver)
export function deleteUser(userId: string): boolean {
  try {
    const users = getUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return false;
    }
    
    // Ne pas supprimer, juste désactiver
    users[userIndex].isActive = false;
    users[userIndex].updatedAt = new Date().toISOString();
    
    return saveUsers(users);
  } catch (error) {
    console.error('Erreur suppression utilisateur:', error);
    return false;
  }
}

// Récupérer un utilisateur par ID
export function getUserById(userId: string): User | null {
  try {
    const users = getUsers();
    return users.find(user => user.id === userId) || null;
  } catch (error) {
    console.error('Erreur récupération utilisateur:', error);
    return null;
  }
}

// Récupérer un utilisateur par code
export function getUserByCode(userCode: string): User | null {
  try {
    const users = getUsers();
    return users.find(user => user.code === userCode && user.isActive) || null;
  } catch (error) {
    console.error('Erreur récupération utilisateur par code:', error);
    return null;
  }
}

// Récupérer les utilisateurs par entreprise
export function getUsersByCompany(companyId: string): User[] {
  try {
    const users = getUsers();
    return users.filter(user => user.companyId === companyId);
  } catch (error) {
    console.error('Erreur récupération utilisateurs par entreprise:', error);
    return [];
  }
}

// Mettre à jour la dernière connexion
export function updateLastLogin(userId: string): boolean {
  try {
    const users = getUsers();
    const userIndex = users.findIndex(user => user.id === userId);
    
    if (userIndex === -1) {
      return false;
    }
    
    users[userIndex].lastLogin = new Date().toISOString();
    users[userIndex].updatedAt = new Date().toISOString();
    
    return saveUsers(users);
  } catch (error) {
    console.error('Erreur mise à jour dernière connexion:', error);
    return false;
  }
}
