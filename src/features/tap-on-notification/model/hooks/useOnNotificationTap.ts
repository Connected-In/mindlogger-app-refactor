import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';

import { EntityPath, EntityType, StoreProgress } from '@app/abstract/lib';
import { AppletModel, clearStorageRecords } from '@app/entities/applet';
import {
  LocalEventDetail,
  LocalInitialNotification,
  LocalNotificationType,
  NotificationModel,
  useBackgroundEvents,
  useForegroundEvent,
  useOnInitialAndroidNotification,
} from '@app/entities/notification';
import { LogTrigger } from '@app/shared/api';
import { useAppSelector } from '@app/shared/lib';

type Input = {
  checkAvailability: (identifiers: EntityPath) => boolean;
};

const GoBackDuration = 1000;

/*
https://mindlogger.atlassian.net/browse/M2-1810
We don't know the exact reason yet.
The bug is fluent.
I've observed console.log exactly at the line before Alert.show, but the alert hasn't been shown!.
Probably this is because of notification re-schedule at the same moment, and all notifications deleted via notify api
and as a result - the current notification-tap thread and all the related threads (created by promises) - canceled, just supposition.
Sometimes I've observed the Alert right after 10-20 seconds, probably because of reload of bundle or because I switched the app from background to foreground
(like modals sometimes hidden and shown on Windows OS if to click alt+tab) - not sure here.
*/
const WorkaroundDuration = 100;

export function useOnNotificationTap({ checkAvailability }: Input) {
  const queryClient = useQueryClient();

  const navigator = useNavigation();

  const storeProgress: StoreProgress = useAppSelector(
    AppletModel.selectors.selectInProgressApplets,
  );

  const { startFlow, startActivity } = AppletModel.useStartEntity();

  const actions: Record<
    LocalNotificationType,
    (eventDetail: LocalEventDetail) => void
  > = {
    'request-to-reschedule-due-to-limit': () => {
      NotificationModel.NotificationRefreshService.refresh(
        queryClient,
        storeProgress,
        LogTrigger.LimitReachedNotification,
      );
    },
    'schedule-event-alert': eventDetail => {
      const { appletId, activityId, activityFlowId, eventId } =
        eventDetail.notification.data;

      const entityId: string = (activityId ?? activityFlowId)!;

      const entityType: EntityType = activityFlowId ? 'flow' : 'regular';

      const executing = isActivityExecuting();

      if (executing) {
        navigator.goBack();
      }

      setTimeout(
        () => {
          startEntity(appletId!, entityId, entityType, eventId!);
        },
        executing ? GoBackDuration : WorkaroundDuration,
      );
    },
  };

  const isActivityExecuting = (): boolean => {
    const navigationState = navigator.getState();
    if (!navigationState) {
      return false;
    }
    const length = navigationState.routes.length;
    const lastRoute = navigationState.routes[length - 1];
    return lastRoute.name === 'InProgressActivity';
  };

  function navigateSurvey({
    appletId,
    eventId,
    entityId,
    entityType,
  }: EntityPath) {
    navigator.navigate('InProgressActivity', {
      appletId,
      eventId,
      entityId,
      entityType,
    });
  }

  const startEntity = (
    appletId: string,
    entityId: string,
    entityType: EntityType,
    eventId: string,
  ) => {
    if (!checkAvailability({ appletId, eventId, entityId, entityType })) {
      return;
    }

    if (entityType === 'flow') {
      startFlow(appletId, entityId, eventId).then(({ startedFromScratch }) => {
        if (startedFromScratch) {
          clearStorageRecords.byEventId(eventId);
        }

        navigateSurvey({ appletId, eventId, entityId, entityType });
      });
    } else {
      startActivity(appletId, entityId, eventId).then(
        ({ startedFromScratch }) => {
          if (startedFromScratch) {
            clearStorageRecords.byEventId(eventId);
          }

          navigateSurvey({ appletId, eventId, entityId, entityType });
        },
      );
    }
  };

  useForegroundEvent({
    onPress: (eventDetail: LocalEventDetail) => {
      const action = actions[eventDetail.notification.data.type];

      action?.(eventDetail);
    },
  });

  useBackgroundEvents({
    onPress: (eventDetail: LocalEventDetail) => {
      const action = actions[eventDetail.notification.data.type];

      action?.(eventDetail);
    },
  });

  useOnInitialAndroidNotification(
    (initialNotification: LocalInitialNotification) => {
      const action = actions[initialNotification.notification.data.type];

      action?.(initialNotification);
    },
  );
}
