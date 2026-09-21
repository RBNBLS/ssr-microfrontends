import { ReactNode, Ref, useRef } from "react";
import Draggable from "react-draggable";

interface CustomWidgetProps {
  ref?: Ref<HTMLDivElement> | undefined;
}

export function CustomWidget({ ref }: CustomWidgetProps) {
  return (
    <Draggable nodeRef={ref as any}>
      <div ref={ref} style={{ width: "50%", height: 450 }}></div>
    </Draggable>
  );
}
