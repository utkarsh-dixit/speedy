import React from "react";
import * as ProgressPrimitive from '@radix-ui/react-progress';
import { blackA } from '@radix-ui/colors';

import { useEffect, useState } from "react";
import { styled } from '@stitches/react';


const StyledProgress = styled(ProgressPrimitive.Root, {
    position: 'relative',
    overflow: 'hidden',
    background: blackA.blackA9,
    borderRadius: '20px',
    width: "100%",
    height: 24,
  
    // Fix overflow clipping in Safari
    // https://gist.github.com/domske/b66047671c780a238b51c51ffde8d3a0
    transform: 'translateZ(0)',
  });
  
  const StyledIndicator = styled(ProgressPrimitive.Indicator, {
    backgroundColor: 'hsl(272 51.0% 54.0%)',
    width: '100%',
    height: '100%',
    transition: 'transform 660ms cubic-bezier(0.65, 0, 0.35, 1)',
  });
  
  // Exports
  export const Progress = StyledProgress;
  export const ProgressIndicator = StyledIndicator;

export const DownloadProgressBar = ({value, ...props}: any) => {
    const [progress, setProgress] = useState(0);

    return (
        <Progress value={value}>
            <ProgressIndicator style={{ transform: `translateX(-${100 - value}%)` }} />
        </Progress>
    );
}
