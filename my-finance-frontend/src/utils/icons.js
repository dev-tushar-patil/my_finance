import {
  Utensils, Home, Stethoscope, ShoppingCart, Apple, Car, Scissors, ShoppingBag, Receipt, GraduationCap,
  MoreHorizontal, PawPrint, Plane, Gift, Dumbbell, Baby, Heart, Briefcase, Laptop, Building2, Users,
  Wallet, TrendingUp, Coins, Gem, PiggyBank, Landmark, Shirt, Film, Fuel, Wrench, Smartphone, Wifi,
  Zap, Droplets, BookOpen, Coffee, Bus, Tag, Music, Gamepad2, Sparkles, HandCoins, BadgeIndianRupee,
} from 'lucide-react';

/**
 * Icon registry. The backend stores an icon *key* per main category; the UI maps it to a component.
 * Users pick from this palette when creating a main type. Unknown keys fall back to Tag.
 */
export const ICONS = {
  utensils: Utensils, home: Home, stethoscope: Stethoscope, cart: ShoppingCart, apple: Apple, car: Car,
  scissors: Scissors, bag: ShoppingBag, receipt: Receipt, education: GraduationCap, more: MoreHorizontal,
  paw: PawPrint, plane: Plane, gift: Gift, fitness: Dumbbell, baby: Baby, heart: Heart, briefcase: Briefcase,
  laptop: Laptop, building: Building2, users: Users, wallet: Wallet, trending: TrendingUp, coins: Coins,
  gem: Gem, piggy: PiggyBank, bank: Landmark, shirt: Shirt, film: Film, fuel: Fuel, wrench: Wrench,
  phone: Smartphone, wifi: Wifi, zap: Zap, water: Droplets, book: BookOpen, coffee: Coffee, bus: Bus,
  tag: Tag, music: Music, game: Gamepad2, sparkles: Sparkles, handcoins: HandCoins, rupee: BadgeIndianRupee,
};

export const ICON_KEYS = Object.keys(ICONS);

export const getIcon = (key) => ICONS[key] || Tag;

/** Soft tint colours for category icon chips, picked deterministically from the id. */
const TINTS = [
  ['#FFF3E0', '#F57C00'], ['#E3F2FD', '#1E88E5'], ['#FDECEC', '#E53935'], ['#E8F5E9', '#2E7D32'],
  ['#EDE7F6', '#673AB7'], ['#FCE4EC', '#D81B60'], ['#E0F7FA', '#00838F'], ['#FFF8E1', '#E0A100'],
  ['#F3E5F5', '#8E24AA'], ['#ECEFF1', '#546E7A'],
];
export const tintFor = (id = 0) => {
  const [bg, fg] = TINTS[Math.abs(Number(id)) % TINTS.length];
  return { bg, fg };
};
