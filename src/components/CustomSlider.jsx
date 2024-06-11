import React from "react";
import {
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
} from "@chakra-ui/react";

const CustomSlider = ({
  min = 0,
  max,
  step = 1,
  value,
  onChange,
  thumbColor,
}) => {
  return (
    <Slider min={min} max={max} step={step} value={value} onChange={onChange}>
      <SliderTrack>
        <SliderFilledTrack bg={thumbColor || "teal.500"} />
      </SliderTrack>
      <SliderThumb boxSize={6} bg={thumbColor || "teal.500"} />
    </Slider>
  );
};

export default CustomSlider;
