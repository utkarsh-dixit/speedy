import { grayDark, slateA } from "@radix-ui/colors";
import React, {useEffect, useState} from "react";

export const Button = ({children, ...props}: any) => {
    // Create dark theme button
    return (
        <button className="hover-button" style={{ fontFamily: "sans-serif", fontSize: 12, backgroundColor: slateA.slateA3, padding: "4px 16px", borderRadius: 4, border: "1px solid " + grayDark.gray7, color: grayDark.gray12}} {...props}>
            {children}
        </button>
    )
};
