import { useEffect, useState } from 'react'
import styles from './assets/styles/app.module.scss'
import { DownloadProgressBar } from './components/downloadProgressBar'
import { blackA, gray, grayA, grayDark, green, greenDark, greenDarkA, mauveDark, oliveDark, sageDark, slateDark } from '@radix-ui/colors';
import { Button } from './components/button'
import { emit, listen } from '@tauri-apps/api/event'
import { invoke } from "@tauri-apps/api/tauri";
import { throttle } from "./utils";

// prettyTimeLeft function
// x days y hours left if time left is more than 1 day
// x hours y minutes left if time left is more than 1 hour
// x minutes y seconds left if time left is more than 1 minute
// x seconds left if time left is less than 1 minute
const prettyTimeLeft = (timeLeft: number) => {
  const days = Math.floor(timeLeft / (60 * 60 * 24));
  const hours = Math.floor((timeLeft % (60 * 60 * 24)) / (60 * 60));
  const minutes = Math.floor((timeLeft % (60 * 60)) / 60);
  const seconds = Math.floor(timeLeft % 60);
  
  if (days > 0) {
    return `${days} days ${hours} hours left`;
  } else if (hours > 0) {
    return `${hours} hours ${minutes} minutes left`;
  } else if (minutes > 0) {
    return `${minutes} minutes ${seconds} seconds left`;
  } else {
    return `${seconds} seconds left`;
  }
}

const DownloadScreen: React.FC = () => {
  const [progress, setProgress] = useState(0)
  const [fileSize, setFileSize] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [estimatedTimeLeft, setEstimatedTimeLeft] = useState(0);

  useEffect(( )=> {
    invoke("greet", { name });

    // throttle listener
    const updateDownloadProgress = throttle((event: any) => {
      const { payload } = event;
      const {fileSize, progress, speed, estimatedTimeLeft} = payload as any;

      setProgress(progress as any);
      setFileSize(fileSize as any);
      setSpeed(speed as any);
      setEstimatedTimeLeft(estimatedTimeLeft as any);
    }, 50);


    // Listen to event
    listen("download-progress", updateDownloadProgress);
  }, []);

  return (
    <div style={{overflowY: "hidden"}} className={styles.app}>
      <header className={styles.appHeader} style={{overflowY: "hidden", fontSize: 14, fontWeight: 400, backgroundColor: grayDark.gray1, alignItems: "flex-start", justifyContent: "flex-start", padding: "20px 16px "}}>
        
        <div style={{overflow: "hidden", overflowX: "scroll", width: "100%"}}>
          <div style={{ fontFamily: "monospace", textAlign: "left", fontSize: 12, whiteSpace: "pre", color: sageDark.sage11 }}>https://github.com/crusher-dev/crusher-downloads/releases/download/v1.0.34/Crusher.Recorder-1.0.34-linux.zip</div>
        </div>
        <div style={{ marginTop: 12, background: green.green11, width: "-webkit-fill-available", borderRadius: 4, padding: "8px 14px"}}>
        <table style={{textAlign: "left", fontSize: 12, fontFamily: "sans-serif", color: sageDark.sage12, borderCollapse: "collapse"}}>
          <tr>
            <th></th>
            <th></th>
          </tr>
          <tr>
          </tr>
          <tr>
            <td style={{fontWeight: "bold"}}>Total Size</td>
            <td  style={{ color: slateDark.slate12 }}>&nbsp;&nbsp;&nbsp;&nbsp;{(fileSize/1024/1024).toFixed(2)} MB</td>
          </tr>
          <tr>
            <td style={{fontWeight: "bold"}}>Download rate</td>
            <td  style={{ color: slateDark.slate12 }}>&nbsp;&nbsp;&nbsp;&nbsp;{(speed/1024/1024).toFixed(2)} MB/s</td>
          </tr>
          {/* Resume capability*/}
          <tr>
            <td style={{fontWeight: "bold"}}>Time left</td>
            <td  style={{ color: slateDark.slate12 }}>&nbsp;&nbsp;&nbsp;&nbsp;{prettyTimeLeft(estimatedTimeLeft)}</td>

          </tr>
        </table>
        </div>
        <div style={{width: "100%", marginTop: 12}}>
          <DownloadProgressBar  value={progress}/>
        </div>
        <div style={{display: "flex", justifyContent: "flex-end", width: "100%", marginTop: 12, gap: 12}}>
          <Button>Pause</Button>
          <Button>Cancel</Button>

        </div>

      </header>
      <style>{`body{ overflow-y: hidden; }
      td{    padding-top: .5em;
        padding-bottom: .5em;}
        ::-webkit-scrollbar{
          display: none;
        } .hover-button:hover {  background-color: transparent !important; border-color: ${ grayDark.gray9 } !important; }
        `}</style>
    </div>
  )
}

export default DownloadScreen;
