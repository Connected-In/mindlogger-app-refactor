import { FileSystem } from 'react-native-file-access';

import {
  ActivityAnswersRequest,
  AnswerDto,
  AnswerService,
  FileService,
  ObjectAnswerDto,
  UserActionDto,
} from '@app/shared/api';
import { MediaFile } from '@app/shared/ui';
import { UserPrivateKeyRecord } from '@entities/identity/lib';
import { encryption } from '@shared/lib';

import MediaFilesCleaner from './MediaFilesCleaner';
import {
  CheckAnswersInput,
  CheckFileUploadResult,
  CheckFilesUploadResults,
  SendAnswersInput,
} from '../types';

export interface IAnswersUploadService {
  sendAnswers(body: SendAnswersInput): void;
}

class AnswersUploadService implements IAnswersUploadService {
  private createdAt: number | null;

  constructor() {
    this.createdAt = null;
  }

  private isFileUrl(value: string): boolean {
    const localFileRegex =
      /^(file:\/\/|\/).*\/[^\/]+?\.(jpg|jpeg|png|gif|mp4|m4a|mov|MOV|svg)$/;

    return localFileRegex.test(value);
  }

  private async checkIfFilesUploaded(
    fileIds: string[],
    fakeResult: boolean = false,
  ): Promise<CheckFilesUploadResults> {
    return fileIds.map(x => ({
      // todo
      uploaded: fakeResult,
      fileId: x,
      remoteUrl: null,
    }));
  }

  private async checkIfAnswersUploaded(
    checkInput: CheckAnswersInput,
    fakeResult: boolean = false,
  ): Promise<boolean> {
    console.log(checkInput);
    return fakeResult; // todo
  }

  private getUploadRecord(
    results: CheckFilesUploadResults,
    fileId: string,
  ): CheckFileUploadResult {
    return results.find(x => x.fileId === fileId)!;
  }

  private getFileId(file: MediaFile): string {
    return `${this.createdAt!.toString()}/${file.fileName}`;
  }

  private collectFileIds(answers: AnswerDto[]): string[] {
    const result: string[] = [];

    for (const itemAnswer of answers) {
      const { value: answerValue } = itemAnswer as ObjectAnswerDto;

      const mediaAnswer = answerValue as MediaFile;

      const isMediaItem = mediaAnswer?.uri && this.isFileUrl(mediaAnswer.uri);

      if (isMediaItem) {
        result.push(this.getFileId(mediaAnswer));
        continue;
      }
    }

    return result;
  }

  private async uploadAnswerMediaFiles(body: SendAnswersInput) {
    const fileIds = this.collectFileIds(body.answers);

    let uploadResults: CheckFilesUploadResults;

    try {
      uploadResults = await this.checkIfFilesUploaded(fileIds);
    } catch (error) {
      throw new Error(
        '[UploadAnswersService.uploadAnswerMediaFiles]: Error occurred on 1st files upload check\n\n' +
          error!.toString(),
      );
    }

    const itemsAnswers = [...body.answers];

    const updatedAnswers = [];

    for (const itemAnswer of itemsAnswers) {
      const { value: answerValue } = itemAnswer as ObjectAnswerDto;

      const mediaAnswer = answerValue as MediaFile;

      const isMediaItem = mediaAnswer?.uri && this.isFileUrl(mediaAnswer.uri);

      if (!isMediaItem) {
        updatedAnswers.push(itemAnswer);
        continue;
      }

      const localFileExists = await FileSystem.exists(mediaAnswer.uri);

      if (!localFileExists) {
        throw new Error(
          '[UploadAnswersService.uploadAnswerMediaFiles]: Local file does not exist',
        );
      }

      const uploadRecord = this.getUploadRecord(
        uploadResults,
        this.getFileId(mediaAnswer),
      );

      if (!uploadRecord) {
        throw new Error(
          '[UploadAnswersService.uploadAnswerMediaFiles]: uploadRecord does not exist',
        );
      }

      try {
        let remoteUrl;

        if (!uploadRecord.uploaded) {
          const uploadResult = await FileService.upload({
            fileName: mediaAnswer.fileName,
            type: mediaAnswer.type,
            uri: mediaAnswer.uri,
          });

          remoteUrl = uploadResult?.data.result.url;
        } else {
          remoteUrl = uploadRecord.remoteUrl;
        }

        const isSvg = mediaAnswer.type === 'image/svg';

        if (remoteUrl && !isSvg) {
          updatedAnswers.push({ value: remoteUrl });
        } else if (remoteUrl) {
          updatedAnswers.push({
            ...(itemAnswer as ObjectAnswerDto),
            uri: remoteUrl,
          });
        }
      } catch (error) {
        console.warn(
          '[UploadAnswersService.uploadAnswerMediaFiles]: Error occurred while file uploading',
          error!.toString(),
        );
        throw error;
      }
    }

    try {
      uploadResults = await this.checkIfFilesUploaded(fileIds, true);
    } catch (error) {
      throw new Error(
        '[uploadAnswerMediaFiles.checkIfFilesUploaded]: Error occurred on 2nd files check api call\n\n' +
          error!.toString(),
      );
    }

    if (uploadResults.some(x => !x.uploaded)) {
      throw new Error(
        '[uploadAnswerMediaFiles.uploadedResult.some]: Error occurred on final upload results check',
      );
    }

    const updatedBody = { ...body, answers: updatedAnswers };

    return updatedBody;
  }

  private async uploadAnswers(
    encryptedData: ActivityAnswersRequest,
    body: SendAnswersInput,
  ) {
    if (body.itemIds.length !== body.answers.length) {
      throw new Error(
        "[UploadAnswersService.uploadAnswers]: Items' length doesn't equal to answers' length ",
      );
    }

    let uploaded: boolean;

    try {
      uploaded = await this.checkIfAnswersUploaded({
        activityId: body.activityId,
        appletId: body.appletId,
        flowId: body.flowId,
        createdAt: body.createdAt,
      });
    } catch (error) {
      console.warn(
        '[UploadAnswersService.uploadAnswers]: Error occurred while 1st check if answers uploaded\n\n',
        error!.toString(),
      );
      throw error;
    }

    if (uploaded) {
      return;
    }

    try {
      await AnswerService.sendActivityAnswers(encryptedData);
    } catch (error) {
      console.warn(
        '[UploadAnswersService.uploadAnswers]: Error occurred while sending answers\n\n',
        error!.toString(),
      );
      throw error;
    }

    try {
      uploaded = await this.checkIfAnswersUploaded(
        {
          activityId: body.activityId,
          appletId: body.appletId,
          flowId: body.flowId,
          createdAt: body.createdAt,
        },
        true,
      );
    } catch (error) {
      console.warn(
        '[UploadAnswersService.uploadAnswers]: Error occurred while 2nd check if answers uploaded\n\n',
        error!.toString(),
      );
      throw error;
    }

    if (!uploaded) {
      throw new Error('[uploadAnswers] Answers were not uploaded');
    }
  }

  private encryptAnswers(data: SendAnswersInput): ActivityAnswersRequest {
    const { appletEncryption } = data;
    const userPrivateKey = UserPrivateKeyRecord.get();

    if (!userPrivateKey) {
      throw new Error('User private key is undefined');
    }

    const { encrypt } = encryption.createEncryptionService({
      ...appletEncryption,
      privateKey: userPrivateKey,
    });

    const encryptedAnswers = encrypt(JSON.stringify(data.answers));

    const encryptedUserActions = encrypt(JSON.stringify(data.userActions));

    const identifier = data.userIdentifier && encrypt(data.userIdentifier);

    const userPublicKey = encryption.getPublicKey({
      privateKey: userPrivateKey,
      appletPrime: JSON.parse(appletEncryption.prime),
      appletBase: JSON.parse(appletEncryption.base),
    });

    const encryptedData: ActivityAnswersRequest = {
      appletId: data.appletId,
      version: data.version,
      flowId: data.flowId,
      submitId: data.executionGroupKey,
      activityId: data.activityId,
      answer: {
        answer: encryptedAnswers,
        itemIds: data.itemIds,
        events: encryptedUserActions,
        startTime: data.startTime,
        endTime: data.endTime,
        scheduledTime: data.scheduledTime,
        userPublicKey: JSON.stringify(userPublicKey),
        identifier,
      },
      createdAt: data.createdAt,
      client: data.client,
    };

    return encryptedData;
  }

  public async sendAnswers(body: SendAnswersInput) {
    this.createdAt = body.createdAt;

    const modifiedBody = await this.uploadAnswerMediaFiles(body);

    const updatedUserActions = this.mapUserActionsMediaFilesToDto(
      body.answers,
      modifiedBody,
    );

    modifiedBody.userActions = updatedUserActions;

    const encryptedData = this.encryptAnswers(modifiedBody);

    await this.uploadAnswers(encryptedData, body);

    MediaFilesCleaner.cleanUpByAnswers(body.answers);
  }

  private mapUserActionsMediaFilesToDto(
    originalAnswers: AnswerDto[],
    modifiedBody: SendAnswersInput,
  ) {
    const userActions = modifiedBody.userActions;
    const updatedAnswers = modifiedBody.answers;

    const updatedUserActions = userActions.map((userAction: UserActionDto) => {
      const response = userAction?.response as ObjectAnswerDto;
      const userActionValue = response?.value as MediaFile;
      const originalAnswerIndex = originalAnswers.findIndex(answer => {
        const currentAnswerValue = (answer as ObjectAnswerDto)
          ?.value as MediaFile;
        return currentAnswerValue?.uri === userActionValue?.uri;
      });

      if (
        userAction.type !== 'SET_ANSWER' ||
        !userActionValue?.uri ||
        originalAnswerIndex === -1
      ) {
        return userAction;
      }

      return {
        ...userAction,
        response: {
          value: (updatedAnswers[originalAnswerIndex] as ObjectAnswerDto).value,
        },
      };
    });

    const userActionsWithoutEmptyFiles = updatedUserActions.map(
      (userAction: UserActionDto) => {
        const response = userAction?.response as ObjectAnswerDto;
        const userActionValue = response?.value as MediaFile;

        if (userActionValue?.uri) {
          return {
            ...userAction,
            response: {
              value: 'File not uploaded',
            },
          };
        }
        return userAction;
      },
    );

    return userActionsWithoutEmptyFiles;
  }
}
export default new AnswersUploadService();
