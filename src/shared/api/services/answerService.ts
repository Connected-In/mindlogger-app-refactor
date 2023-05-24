import { AxiosResponse } from 'axios';

import httpService from './httpService';
import { SuccessfulEmptyResponse } from '../types';

export type EncryptedAnswerDto = {
  flowId: string | null;
  activityId: string;
  answer: string;
  itemIds: (string | undefined)[];
};

export type AnswerDto = {
  activityId: string;
  flowId: string | null;
  itemIds: (string | undefined)[];
  answer: {
    value: string | number | Array<string>;
    additionalText?: string;
    shouldIdentifyResponse?: boolean;
  };
};

type ActivityAnswersRequest = {
  appletId: string;
  version: string;
  createdAt: number;
  answers: Array<EncryptedAnswerDto>;
};

type ActivityAnswersResponse = SuccessfulEmptyResponse;

type FakeResponse = AxiosResponse<ActivityAnswersResponse>;

const mockActivity = false;

function answerService() {
  return {
    sendActivityAnswers(request: ActivityAnswersRequest) {
      if (mockActivity) {
        const response: FakeResponse = {} as FakeResponse;
        return Promise.resolve(response);
      }

      return httpService.post<ActivityAnswersResponse>('/answers', request);
    },
  };
}

export const AnswerService = answerService();
