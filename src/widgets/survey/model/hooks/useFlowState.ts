import { useMemo, useState } from 'react';

import { useAppletDetailsQuery } from '@app/entities/applet';

import { buildPipeline, buildSinglePipeline } from '../pipelineBuilder';

export type UseFlowStateArgs = {
  appletId: string;
  eventId: string;
  flowId?: string;
  activityId: string;
};

export function useFlowState({
  appletId,
  eventId,
  activityId,
  flowId,
}: UseFlowStateArgs) {
  const [step, setStep] = useState(0);

  const { data: applet } = useAppletDetailsQuery(appletId, {
    select: r => r.data.result,
  });

  const pipeline = useMemo(() => {
    if (!applet) {
      return [];
    }

    if (!flowId) {
      return buildSinglePipeline({ appletId, eventId, activityId });
    }

    let activityIds = applet.activityFlows.find(
      flow => flow.id === flowId,
    )?.activityIds;

    // @todo remove it when the integration is done
    if (!activityIds) {
      activityIds = ['aid2', 'aid1'];
    }

    return activityIds
      ? buildPipeline({
          fromActivityId: activityId,
          activityIds,
          appletId,
          eventId,
          flowId,
        })
      : [];
  }, [activityId, applet, appletId, eventId, flowId]);

  function next() {
    setStep(step + 1);
  }

  function back() {
    const currentItem = pipeline[step];

    if (currentItem.type === 'Intermediate') {
      setStep(step - 1);
    }
  }

  return {
    step,
    next,
    back,
    pipeline,
  };
}
