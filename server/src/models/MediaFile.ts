import { IsMimeType, IsIn, Min } from 'class-validator'
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from 'typeorm'

@Entity()
export default class MediaFile extends BaseEntity {

  @Column({
    nullable: false
  })
  fileName: string;

  @Column({
    nullable: false
  })
  mediaId: number;

  @Column({
    nullable: false
  })
  @IsIn([ 'episode', 'movie' ])
  mediaType: string;

  @Column({
    nullable: false
  })
  @IsMimeType()
  mimeType: string;

  @Column()
  @Min(1)
  part: number;


  @PrimaryGeneratedColumn()
  id: number;

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}