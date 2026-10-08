import { sqliteTable, text, integer, real, primaryKey, index } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(), username: text('username').notNull(),
  usernameKey: text('username_key').notNull().unique(), passwordHash: text('password_hash').notNull(),
  salt: text('salt').notNull(), createdAt: integer('created_at').notNull(),
});
export const sessions = sqliteTable('sessions', {
  token: text('token').primaryKey(), userId: text('user_id').notNull().references(() => users.id), expires: integer('expires').notNull(),
});
export const listings = sqliteTable('listings', {
  id: text('id').primaryKey(), sellerId: text('seller_id').notNull().references(() => users.id),
  cocId: text('coc_id').notNull(), townHall: integer('town_hall_level').notNull(), price: real('price').notNull(),
  contact: text('contact_info').notNull(), status: text('status').notNull().default('available'), createdAt: integer('created_at').notNull(),
});
export const rooms = sqliteTable('rooms', {
  id: text('id').primaryKey(), listingId: text('listing_id').notNull().references(() => listings.id),
  buyerId: text('buyer_id').notNull().references(() => users.id), sellerId: text('seller_id').notNull().references(() => users.id),
}, t => [index('rooms_buyer').on(t.buyerId), index('rooms_seller').on(t.sellerId)]);
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(), chatRoomId: text('chat_room_id').notNull().references(() => rooms.id),
  senderId: text('sender_id').notNull().references(() => users.id), receiverId: text('receiver_id').notNull().references(() => users.id),
  content: text('content').notNull(), timestamp: integer('timestamp').notNull(),
}, t => [index('messages_room_time').on(t.chatRoomId, t.timestamp)]);
export const blocks = sqliteTable('blocks', {
  userId: text('user_id').notNull().references(() => users.id), targetUserId: text('target_user_id').notNull().references(() => users.id),
}, t => [primaryKey({columns: [t.userId, t.targetUserId]})]);
export const aliases = sqliteTable('user_aliases', {
  userId: text('user_id').notNull().references(() => users.id), targetUserId: text('target_user_id').notNull().references(() => users.id), nickname: text('nickname').notNull(),
}, t => [primaryKey({columns: [t.userId, t.targetUserId]})]);
export const attempts = sqliteTable('auth_attempts', { key: text('key').primaryKey(), count: integer('count').notNull(), reset: integer('reset').notNull() });
