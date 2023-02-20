import { FC } from 'react';

import { Box, XStack, YStack, Text, Image, Slider } from '@shared/ui';

const THUMB_SIZE = 22;

type OldProps = {
  //@todo make sure backend will update config to new keys described below (type Config)
  config: {
    minValue: string;
    maxValue: string;
    itemList: [{ value: number | string }];
    textAnchors: boolean;
    tickMark: boolean;
    tickLabel: boolean;
    continousSlider: boolean;
    minValueImg: string;
    maxValueImg: string;
  };
  initialValue?: number;
  onChange: (value: number) => void;
  onPress?: () => void;
  onRelease?: () => void;
};

// type Config = {
//   leftTitle: string; // was minValue
//   rightTitle: string; // was maxValue
//   showTitles: boolean; // was textAnchors
//   leftImageUrl: string; // was minValueImg
//   rightImageUrl: string; // was maxValueImg
//   showTickMarks: boolean; // was tickMark
//   showTickLabels: boolean; // was tickLabel
//   isContinuousSlider: boolean; // was continousSlider
//   items: [
//     {
//       name: string;
//       value: string | number;
//       score: number;
//       isVisible: boolean;
//     },
//   ];
//   // was itemList: [
//   //   {
//   //     name: { en: string | number };
//   //     value: string | number;
//   //     score: number;
//   //     isVis: boolean;
//   //   },
//   // ]
// };

const SurveySlider: FC<OldProps> = ({ config, ...props }) => {
  const {
    minValue,
    maxValue,
    itemList,
    textAnchors,
    tickMark,
    tickLabel,
    continousSlider,
    minValueImg,
    maxValueImg,
  } = config;

  const { onChange, onRelease, onPress } = props;

  const onValueChange = (arrayOfValues: number[]) => {
    const [firstElement] = itemList;
    const [value] = arrayOfValues;
    const numericValue = value + Number(firstElement.value);
    const roundedValue = Math.round(numericValue * 100) / 100;
    onChange(roundedValue);
  };

  return (
    <YStack>
      <Slider
        onResponderRelease={onRelease}
        onResponderStart={onPress}
        onValueChange={onValueChange}
        size={THUMB_SIZE}
        max={itemList.length - 1}
        step={continousSlider ? 0.01 : 1}
      />

      <XStack jc="space-between" mt={9}>
        {itemList.map(({ value }) => {
          return (
            <Box key={`tick-${value}`} w={THUMB_SIZE} ai="center">
              {tickMark && <Box w={1} bg="$black" h={8} />}
              {tickLabel && <Text mt="$1">{value}</Text>}
            </Box>
          );
        })}
      </XStack>

      <XStack mt="$2" jc="space-between">
        <YStack maxWidth="30%" ai="center">
          {minValueImg && (
            <Image
              width={45}
              height={45}
              resizeMode="contain"
              src={minValueImg}
            />
          )}

          {textAnchors && minValue ? (
            <Text textAlign="center">{minValue}</Text>
          ) : null}
        </YStack>

        <YStack maxWidth="30%" ml="auto" ai="center">
          {maxValueImg && (
            <XStack jc="center">
              <Image
                width={45}
                height={45}
                resizeMode="contain"
                src={maxValueImg}
              />
            </XStack>
          )}

          {textAnchors && maxValue ? (
            <Text textAlign="center">{maxValue}</Text>
          ) : null}
        </YStack>
      </XStack>
    </YStack>
  );
};

export default SurveySlider;
