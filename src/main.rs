
use tokio::{io::AsyncWriteExt, task::futures};
use clap::Parser;

use speedy::client::{self, Client};
/// Search for a pattern in a file and display the lines that contain it.
#[derive(Parser)]
struct Cli {
    /// The pattern to look for
    #[arg(short = 'n', long = "")]
    numThreads: Option<u64>,
    /// The URL of the file to download
    url: Option<std::path::PathBuf>,
}

fn test() -> u32 {
    3
}

#[tokio::main]
async fn main()  -> Result<(), Box<dyn std::error::Error>> {
    let args = Cli::parse();

    let url = args.url.unwrap_or("https://r1---sn-5jucgv5qc5oq-w5pe.gvt1.com/edgedl/android/studio/install/2021.3.1.17/android-studio-2021.3.1.17-windows.exe?cms_redirect=yes&mh=P9&mip=49.204.160.195&mm=28&mn=sn-5jucgv5qc5oq-w5pe&ms=nvh&mt=1671386431&mv=m&mvi=1&pl=22&shardbypass=sd".parse().unwrap()).to_str().unwrap().to_string();
    let parts = args.numThreads.unwrap_or(5);

    let mut client = Client::new(url.clone(), parts.clone());
    let downloadTask = client.download().await;
    
    Ok(())
}
