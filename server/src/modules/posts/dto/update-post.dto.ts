import { PartialType } from '@nestjs/swagger';
import { CreatePostDto } from './create-post.dto';

/** Every field is optional. Send `null` for price, priceUnit, contacts or coordinates to clear them. */
export class UpdatePostDto extends PartialType(CreatePostDto) {}
