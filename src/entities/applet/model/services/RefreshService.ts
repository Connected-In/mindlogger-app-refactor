import { CacheManager } from '@georstat/react-native-image-cache';
import type { QueryClient } from '@tanstack/react-query';
import { AxiosResponse } from 'axios';

import { AppletEventsResponse, AppletsResponse } from '@app/shared/api';
import { AppletsService, AppletDto } from '@app/shared/api';
import {
  ILogger,
  IMutex,
  ImageUrl,
  Mutex,
  getActivityDetailsKey,
  getAppletDetailsKey,
  getAppletsKey,
  getCompletedEntitiesKey,
  getEventsKey,
  isAppOnline,
  onNetworkUnavailable,
} from '@app/shared/lib';

import RefreshDataCollector, {
  CollectAllAppletEventsResult,
  CollectAppletInternalsResult,
  IRefreshDataCollector,
} from './RefreshDataCollector';
import RefreshOptimization from './RefreshOptimization';
import { onAppletListRefreshError, onAppletRefreshError } from '../../lib';

type UnsuccessfulApplet = {
  appletId: string;
  appletName: string;
};

type RefreshResult = {
  success: boolean;
  unsuccessfulApplets: Array<UnsuccessfulApplet>;
};

interface IRefreshService {
  refresh(): void;
}

class RefreshService implements IRefreshService {
  private queryClient: QueryClient;

  private logger: ILogger;
  private static mutex: IMutex = Mutex();
  private showWrongUrlLogs: boolean;
  private dataCollector: IRefreshDataCollector;

  constructor(queryClient: QueryClient, logger: ILogger) {
    this.queryClient = queryClient;
    this.logger = logger;
    this.showWrongUrlLogs = false;
    this.dataCollector = new RefreshDataCollector();
  }

  private async resetEventsQuery() {
    await this.queryClient.removeQueries(['events']);
  }

  private resetAppletListQuery() {
    this.queryClient.removeQueries({
      exact: true,
      queryKey: getAppletsKey(),
    });
  }

  private resetAppletDetailsQuery(appletId: string) {
    this.queryClient.removeQueries({
      exact: true,
      queryKey: getAppletDetailsKey(appletId),
    });
  }

  private resetActivityDetailsQuery(activityId: string) {
    this.queryClient.removeQueries({
      exact: true,
      queryKey: getActivityDetailsKey(activityId),
    });
  }

  private async invalidateCompletedEntities() {
    await this.queryClient.invalidateQueries({
      queryKey: getCompletedEntitiesKey(),
    });
  }

  private isUrlValid = (url: string): boolean => {
    return url.includes('www') || url.includes('http');
  };

  private cacheImages(urls: ImageUrl[]) {
    for (let url of urls) {
      try {
        if (!this.isUrlValid(url)) {
          continue;
        }
        CacheManager.prefetch(url);
      } catch (err) {
        this.showWrongUrlLogs &&
          this.logger.info(
            '[RefreshService.cacheImages] Ignored due to error: url: ' + url,
          );
      }
    }
  }

  private refreshEvents(
    appletId: string,
    eventsResponse: AxiosResponse<AppletEventsResponse>,
  ) {
    const eventsKey = getEventsKey(appletId);

    this.queryClient.setQueryData(eventsKey, eventsResponse);
  }

  private refreshApplet(appletInternalDtos: CollectAppletInternalsResult) {
    this.resetAppletDetailsQuery(appletInternalDtos.appletId);

    for (let activity of appletInternalDtos.activities) {
      const activityDto = activity.activityDetailsResponse.data.result;

      this.resetActivityDetailsQuery(activityDto.id);

      const activityKey = getActivityDetailsKey(activityDto.id);

      this.queryClient.setQueryData(
        activityKey,
        activity.activityDetailsResponse,
      );

      this.cacheImages(activity.imageUrls);
    }

    const appletDetailsKey = getAppletDetailsKey(appletInternalDtos.appletId);

    this.queryClient.setQueryData(
      appletDetailsKey,
      appletInternalDtos.appletDetailsResponse,
    );

    this.cacheImages(appletInternalDtos.imageUrls);
  }

  private async refreshInternal(): Promise<RefreshResult> {
    const optimization = new RefreshOptimization(this.queryClient);
    optimization.keepExistingAppletVersions();

    await this.resetEventsQuery();
    await this.resetAppletListQuery();

    let appletsResponse: AxiosResponse<AppletsResponse>;

    try {
      appletsResponse = await AppletsService.getApplets();

      this.queryClient.setQueryData(getAppletsKey(), appletsResponse);
    } catch (error) {
      this.logger.warn(
        '[RefreshService.refreshAllApplets]: Error occurred during refresh flat list of applets',
      );
      return {
        success: false,
        unsuccessfulApplets: [],
      };
    }

    let allAppletEvents: CollectAllAppletEventsResult;

    try {
      this.logger.log(
        '[RefreshService.refreshInternal]: Getting all applet events',
      );
      allAppletEvents = await this.dataCollector.collectAllAppletsEvents(
        appletsResponse.data.result.map(x => ({
          id: x.id,
          name: x.displayName,
        })),
      );
    } catch (error) {
      this.logger.log(
        '[RefreshService.refreshInternal]: Error occurred during getting all applet events:Internal error:\n\n' +
          error,
      );
      return {
        success: false,
        unsuccessfulApplets: [],
      };
    }

    const appletDtos: AppletDto[] = appletsResponse.data.result;

    const unsuccessfulApplets: UnsuccessfulApplet[] = [];

    for (let appletDto of appletDtos) {
      try {
        if (optimization.shouldBeFullyUpdated(appletDto)) {
          const appletInternalDtos: CollectAppletInternalsResult =
            await this.dataCollector.collectAppletInternals(appletDto);

          this.refreshApplet(appletInternalDtos);

          const eventsResponse = allAppletEvents.appletEvents[appletDto.id];

          this.refreshEvents(appletDto.id, eventsResponse);

          this.logger.log(
            `[RefreshService.refreshAllApplets]: Applet "${appletDto.displayName}|${appletDto.id}" refreshed successfully`,
          );
        } else {
          const eventsResponse = allAppletEvents.appletEvents[appletDto.id];

          this.refreshEvents(appletDto.id, eventsResponse);

          this.logger.log(
            `[RefreshService.refreshAllApplets]: Applet "${appletDto.displayName}|${appletDto.id}" refresh skipped due to versions are the same`,
          );
        }
      } catch (error) {
        this.logger.warn(
          `[RefreshService.refreshAllApplets]: Error occurred during refresh the applet "${appletDto.displayName}|${appletDto.id}".\nInternal error:\n\n` +
            error!.toString(),
        );
        unsuccessfulApplets.push({
          appletId: appletDto.id,
          appletName: appletDto.displayName,
        });
      }
    }

    this.invalidateCompletedEntities();

    return {
      success: unsuccessfulApplets.length === 0,
      unsuccessfulApplets,
    };
  }

  // PUBLIC

  public static isBusy() {
    return RefreshService.mutex.isBusy();
  }

  public async refresh() {
    const isOnline = await isAppOnline();

    if (!isOnline) {
      await onNetworkUnavailable();
      return;
    }

    if (RefreshService.mutex.isBusy()) {
      this.logger.log('[RefreshService.process]: Mutex is busy');
      return;
    }

    try {
      RefreshService.mutex.setBusy();

      const refreshResult = await this.refreshInternal();

      if (!refreshResult.success && !refreshResult.unsuccessfulApplets.length) {
        onAppletRefreshError();
      }

      if (!refreshResult.success && refreshResult.unsuccessfulApplets.length) {
        onAppletListRefreshError(
          refreshResult.unsuccessfulApplets.map(x => x.appletName),
        );
      }
    } catch (error) {
      this.logger.warn(
        '[RefreshService.process]: Error occurred:\nInternal error:\n\n' +
          error!.toString(),
      );
    } finally {
      RefreshService.mutex.release();
    }
  }
}

export default RefreshService;
