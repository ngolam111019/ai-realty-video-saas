// services/main-api/src/project/project.controller.ts
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '../auth/auth.guard';
import { ProjectService } from './project.service';

@Controller()
@UseGuards(AuthGuard)
export class ProjectController {
  constructor(private projectService: ProjectService) {}

  @Post('projects')
  async createProject(@Req() req: any, @Body() data: any) {
    return this.projectService.createProject(req.user.id, data);
  }

  @Get('projects')
  async getProjects(@Req() req: any) {
    return this.projectService.getProjects(req.user.id);
  }

  @Get('projects/:id')
  async getProject(@Req() req: any, @Param('id') id: string) {
    return this.projectService.getProject(req.user.id, id);
  }

  @Put('projects/:id')
  async updateProject(
    @Req() req: any,
    @Param('id') id: string,
    @Body() data: any,
  ) {
    return this.projectService.updateProject(req.user.id, id, data);
  }

  @Delete('projects/:id')
  async deleteProject(@Req() req: any, @Param('id') id: string) {
    return this.projectService.deleteProject(req.user.id, id);
  }

  @Post('projects/:id/media')
  @UseInterceptors(FileInterceptor('file'))
  async uploadMedia(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('isPortrait') isPortrait?: string,
  ) {
    const isPort = isPortrait === 'true' || isPortrait === '1';
    return this.projectService.uploadMedia(req.user.id, id, file, isPort);
  }

  @Post('media/presigned-url')
  async generatePresignedUrl(
    @Req() req: any,
    @Body('projectId') projectId: string,
    @Body('fileName') fileName: string,
    @Body('fileSize') fileSize: number,
    @Body('mimeType') mimeType: string,
  ) {
    return this.projectService.generatePresignedUrl(
      req.user.id,
      projectId,
      fileName,
      fileSize,
      mimeType,
    );
  }

  @Post('media/confirm-upload')
  async confirmUpload(
    @Req() req: any,
    @Body('projectId') projectId: string,
    @Body('storageKey') storageKey: string,
    @Body('fileName') fileName: string,
    @Body('fileSize') fileSize: number,
    @Body('mimeType') mimeType: string,
    @Body('type') type: 'IMAGE' | 'VIDEO_CLIP' | 'PORTRAIT',
  ) {
    return this.projectService.confirmUpload(
      req.user.id,
      projectId,
      storageKey,
      fileName,
      fileSize,
      mimeType,
      type,
    );
  }
}
