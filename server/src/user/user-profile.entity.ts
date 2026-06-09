import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  UpdateDateColumn,
} from 'typeorm';

/** 用户资料实体（MVP 仅维护一个 default 用户） */
@Entity('user_profile')
export class UserProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'text', unique: true })
  key: string;

  @Column({ type: 'text' })
  nickname: string;

  @Column({ name: 'avatar_url', type: 'text', default: '' })
  avatarUrl: string;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
