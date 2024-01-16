import { addDays, addMonths, subDays, subMonths } from 'date-fns';

import {
  ActivityPipelineType,
  AvailabilityType,
  NotificationTriggerType,
  PeriodicityType,
} from '@app/abstract/lib';
import {
  BreakReason,
  EventEntity,
  EventNotificationDescribers,
  NotificationDescriber,
  NotificationType,
  ScheduleEvent,
} from '@app/entities/notification/lib';

import {
  createNotificationBuilder,
  INotificationBuilder,
} from '../NotificationBuilder';

const anyDay = new Date(2018, 1, 2);

const mockUtilityProps = (
  builder: INotificationBuilder,
  now: Date,
  setTime = true,
) => {
  const date = new Date(now);

  if (setTime) {
    date.setHours(15);
    date.setMinutes(30);
  }

  //@ts-ignore
  builder.utility.now = date;
};

const getTestEvent = (): ScheduleEvent => {
  return {
    entityId: 'mock-entity-id',
    id: 'mock-event-id',
    scheduledAt: null,
    selectedDate: null,
    notificationSettings: {
      notifications: [],
      reminder: null,
    },
    availability: {
      allowAccessBeforeFromTime: false,
      availabilityType: AvailabilityType.ScheduledAccess,
      periodicityType: PeriodicityType.Daily,
      oneTimeCompletion: false,
      endDate: null,
      startDate: null,
      timeFrom: null,
      timeTo: null,
    },
  };
};

const setNormalSettingsToEvent = (
  event: ScheduleEvent,
  periodicityType: PeriodicityType,
  today: Date,
  setReminder = false,
) => {
  event.availability.timeFrom =
    periodicityType === PeriodicityType.Always
      ? { hours: 0, minutes: 0 }
      : { hours: 15, minutes: 30 };
  event.availability.timeTo =
    periodicityType === PeriodicityType.Always
      ? { hours: 23, minutes: 59 }
      : { hours: 20, minutes: 15 };
  event.availability.availabilityType =
    periodicityType === PeriodicityType.Always
      ? AvailabilityType.AlwaysAvailable
      : AvailabilityType.ScheduledAccess;
  event.availability.periodicityType = periodicityType;
  event.availability.startDate = subMonths(today, 1);
  event.availability.endDate = addMonths(today, 1);
  event.notificationSettings.notifications.push({
    at: { hours: 15, minutes: 30 },
    triggerType: NotificationTriggerType.FIXED,
    from: null,
    to: null,
  });
  if (setReminder) {
    event.notificationSettings.reminder = {
      activityIncomplete: 1,
      reminderTime: { hours: 18, minutes: 25 },
    };
  }
};

const getEventEntity = (event: ScheduleEvent): EventEntity => {
  return {
    event,
    entity: {
      description: 'mock-entity-description',
      name: 'mock-entity-name',
      id: 'mock-entity-id',
      isVisible: true,
      pipelineType: ActivityPipelineType.Regular,
    },
  };
};

const createBuilder = (eventEntity: EventEntity) => {
  return createNotificationBuilder({
    appletId: 'mock-applet-id',
    appletName: 'mock-applet-name',
    completions: {},
    eventEntities: [eventEntity],
    progress: {},
  });
};

const getMockNotification = (index = 1) => {
  const result: NotificationDescriber = {
    activityFlowId: null,
    activityId: 'mock-entity-id',
    appletId: 'mock-applet-id',
    entityName: 'mock-entity-name',
    eventId: 'mock-event-id',
    isActive: true,
    notificationBody: 'mock-notification-body',
    notificationHeader: 'mock-notification-header',
    notificationId: 'ock-notification-id' + index,
    scheduledAt: new Date(2024, 0, 1).getTime(),
    scheduledAtString: new Date(2024, 0, 1).toString(),
    shortId: 'mock-shortId' + index,
    type: NotificationType.Regular,
  };
  return result;
};

const repeatablePeriodicity = [
  PeriodicityType.Daily,
  PeriodicityType.Weekly,
  PeriodicityType.Weekdays,
  PeriodicityType.Monthly,
];

const anyPeriodicity = [
  PeriodicityType.NotDefined,
  PeriodicityType.Always,
  PeriodicityType.Once,
  PeriodicityType.Daily,
  PeriodicityType.Weekly,
  PeriodicityType.Weekdays,
  PeriodicityType.Monthly,
];

describe('NotificationBuilder: processEvent tests', () => {
  describe('Test breaking of algorithm', () => {
    anyPeriodicity.forEach(periodicity => {
      it(`Should break with the reason ScheduledAtIsEmpty when scheduledAt is not set and periodicity=${periodicity}`, () => {
        const today = new Date(2024, 0, 3);

        const event = getTestEvent();
        setNormalSettingsToEvent(event, periodicity, today);

        event.scheduledAt = null;

        const eventEntity = getEventEntity(event);

        const builder = createBuilder(eventEntity);
        mockUtilityProps(builder, today);

        const result = builder.build();

        const expected: EventNotificationDescribers = {
          eventId: 'mock-event-id',
          eventName: '',
          notifications: [],
          scheduleEvent: event,
          breakReason: BreakReason.ScheduledAtIsEmpty,
        };

        expect(result.events).toEqual([expected]);
      });
    });

    it('Should break with the reason ScheduledDayIsLessThanYesterday when scheduledAt is 1 day before yesterday and periodicity is Once', () => {
      const today = new Date(2024, 0, 3);

      const event = getTestEvent();
      setNormalSettingsToEvent(event, PeriodicityType.Once, today);

      event.scheduledAt = subDays(today, 2);

      const eventEntity = getEventEntity(event);

      const builder = createBuilder(eventEntity);
      mockUtilityProps(builder, today);

      const result = builder.build();

      const expected: EventNotificationDescribers = {
        eventId: 'mock-event-id',
        eventName:
          'For mock-entity-name, ONCE, 1 notifications, reminder unset',
        notifications: [],
        scheduleEvent: event,
        breakReason: BreakReason.ScheduledDayIsLessThanYesterday,
      };

      expect(result.events).toEqual([expected]);
    });

    repeatablePeriodicity.forEach(periodicity => {
      it(`Should break with the reason EventDayToIsLessThanCurrentDay when event-endDate is less than today and periodicity is ${periodicity}`, () => {
        const today = new Date(2024, 0, 3);

        const event = getTestEvent();
        setNormalSettingsToEvent(event, periodicity, today);
        event.availability.endDate = subDays(today, 1);
        event.scheduledAt = today;

        const eventEntity = getEventEntity(event);

        const builder = createBuilder(eventEntity);
        mockUtilityProps(builder, today);

        const result = builder.build();

        const expected: EventNotificationDescribers = {
          eventId: 'mock-event-id',
          eventName: `For mock-entity-name, ${periodicity}, 1 notifications, reminder unset`,
          notifications: [],
          scheduleEvent: event,
          breakReason: BreakReason.EventDayToIsLessThanCurrentDay,
        };

        expect(result.events).toEqual([expected]);
      });
    });

    repeatablePeriodicity.forEach(periodicity => {
      it(`Should break with the reason EventDayFromIsMoreThanLastScheduleDay when event-startDate is more than lastScheduleDay and periodicity is ${periodicity}`, () => {
        const today = new Date(2024, 0, 3);

        const event = getTestEvent();
        setNormalSettingsToEvent(event, periodicity, today);

        event.scheduledAt = today;

        const eventEntity = getEventEntity(event);

        const builder = createBuilder(eventEntity);
        mockUtilityProps(builder, today);

        event.availability.startDate = addDays(
          //@ts-ignore
          builder.utility.lastScheduleDay,
          1,
        );

        const result = builder.build();

        const expected: EventNotificationDescribers = {
          eventId: 'mock-event-id',
          eventName: `For mock-entity-name, ${periodicity}, 1 notifications, reminder unset`,
          notifications: [],
          scheduleEvent: event,
          breakReason: BreakReason.EventDayFromIsMoreThanLastScheduleDay,
        };

        expect(result.events).toEqual([expected]);
      });
    });

    anyPeriodicity.forEach(periodicity => {
      it(`Should break with the reason EntityHidden when entity-isVisible flag is false and periodicity is ${periodicity}`, () => {
        const today = new Date(2024, 0, 3);

        const event = getTestEvent();
        setNormalSettingsToEvent(event, periodicity, today);

        event.scheduledAt = today;

        const eventEntity = getEventEntity(event);
        eventEntity.entity.isVisible = false;

        const builder = createBuilder(eventEntity);
        mockUtilityProps(builder, today);

        const result = builder.build();

        const expected: EventNotificationDescribers = {
          eventId: 'mock-event-id',
          eventName: `For mock-entity-name, ${periodicity}, 1 notifications, reminder unset`,
          notifications: [],
          scheduleEvent: event,
          breakReason: BreakReason.EntityHidden,
        };

        expect(result.events).toEqual([expected]);
      });
    });
  });

  describe('Test the processing part of algorithm', () => {
    it('Should call both: processEventDay and reminderCreator.create each one once when periodicity is once', () => {
      const today = new Date(2024, 0, 3);

      const event = getTestEvent();
      setNormalSettingsToEvent(event, PeriodicityType.Once, today, true);

      event.scheduledAt = new Date(today);

      const eventEntity = getEventEntity(event);

      const builder = createBuilder(eventEntity);
      mockUtilityProps(builder, today);

      const mockNotification = getMockNotification(1);
      const mockReminder = getMockNotification(2);
      mockReminder.type = NotificationType.Reminder;

      const processEventDayMock = jest.fn();
      const mockCreateReminder = jest.fn();
      //@ts-ignore
      builder.processEventDay = processEventDayMock.mockReturnValue([
        mockNotification,
      ]);
      //@ts-ignore
      builder.reminderCreator.create = mockCreateReminder.mockReturnValue([
        { reminder: mockReminder, eventDay: new Date(anyDay) },
      ]);

      const result = builder.build();

      const expected: EventNotificationDescribers = {
        eventId: 'mock-event-id',
        eventName: `For mock-entity-name, ${PeriodicityType.Once}, 1 notifications, reminder set`,
        notifications: [mockNotification, mockReminder],
        scheduleEvent: event,
      };

      expect(result.events).toEqual([expected]);
      expect(processEventDayMock).toHaveBeenCalledTimes(1);
      expect(mockCreateReminder).toHaveBeenCalledTimes(1);
    });

    repeatablePeriodicity.forEach(periodicity => {
      it(`Should fulfill array with reminders and notifications in correct order way when periodicity is ${periodicity} and 1 reminder is not associated with an event day`, () => {
        const today = new Date(2024, 0, 3);

        const event = getTestEvent();
        setNormalSettingsToEvent(event, periodicity, today, true);

        event.scheduledAt = new Date(today);

        const eventEntity = getEventEntity(event);

        const builder = createBuilder(eventEntity);
        mockUtilityProps(builder, today);

        const extractEventDaysMock = jest.fn();
        //@ts-ignore
        builder.notificationDaysExtractor.extract =
          extractEventDaysMock.mockReturnValue([
            new Date(today),
            addDays(today, 1),
            addDays(today, 2),
          ]);

        //@ts-ignore
        builder.notificationDaysExtractor.extractForReminders = jest.fn();

        const mockedReminders = [
          getMockNotification(2),
          getMockNotification(3),
          getMockNotification(4),
        ].map((r, index) => {
          r.type = NotificationType.Reminder;
          return { reminder: r, eventDay: addDays(today, index - 1) };
        });

        const mockCreateReminder = jest.fn().mockReturnValue(mockedReminders);
        //@ts-ignore
        builder.reminderCreator.create = mockCreateReminder;

        const mockNotification = getMockNotification(1);

        const processEventDayMock = jest.fn();
        //@ts-ignore
        builder.processEventDay = processEventDayMock.mockReturnValue([
          mockNotification,
        ]);

        const result = builder.build();

        const expected: EventNotificationDescribers = {
          eventId: 'mock-event-id',
          eventName: `For mock-entity-name, ${periodicity}, 1 notifications, reminder set`,
          notifications: [
            mockedReminders[0].reminder,
            mockNotification,
            mockedReminders[1].reminder,
            mockNotification,
            mockedReminders[2].reminder,
            mockNotification,
          ],
          scheduleEvent: event,
        };

        expect(result.events).toEqual([expected]);
        expect(processEventDayMock).toHaveBeenCalledTimes(3);
        expect(mockCreateReminder).toHaveBeenCalledTimes(1);
      });
    });
  });
});
