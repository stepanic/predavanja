// Detekcija osoba u proxyju kamere (Apple Vision, bez dodatnih paketa).
// Čita video AVAssetReaderom, svakih `step` sekundi pušta frame kroz
// VNDetectHumanRectanglesRequest i piše JSON: {"step", "w", "h", "frames": [[t, [[x, y, w, h, conf], ...]], ...]}.
// Koordinate su normalizirane 0–1 s ishodištem gore lijevo (Vision ga ima dolje lijevo).
//
//   swiftc -O detect_people.swift -o /tmp/detect_people && /tmp/detect_people proxy/moto.mp4 crop/moto_people.json 0.5
import AVFoundation
import Foundation
import Vision

let args = CommandLine.arguments
guard args.count >= 3 else { print("upotreba: detect_people <video> <out.json> [korak_s]"); exit(1) }
let step = args.count > 3 ? Double(args[3])! : 0.5

let asset = AVURLAsset(url: URL(fileURLWithPath: args[1]))
let track = asset.tracks(withMediaType: .video)[0]
let size = track.naturalSize
let duration = CMTimeGetSeconds(asset.duration)
let reader = try AVAssetReader(asset: asset)
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA])
out.alwaysCopiesSampleData = false
reader.add(out)
reader.startReading()

let request = VNDetectHumanRectanglesRequest()
request.upperBodyOnly = false
var frames: [[Any]] = []
var next = 0.0
var lastLog = Date()
while let sample = out.copyNextSampleBuffer() {
    let t = CMTimeGetSeconds(CMSampleBufferGetPresentationTimeStamp(sample))
    guard t + 1e-6 >= next, let px = CMSampleBufferGetImageBuffer(sample) else { continue }
    next += step
    while next <= t { next += step }   // VFR (moto): ne gomilaj zaostale korake
    try VNImageRequestHandler(cvPixelBuffer: px, options: [:]).perform([request])
    let boxes: [[Double]] = (request.results ?? []).map { r in
        let b = r.boundingBox
        return [b.minX, 1 - b.maxY, b.width, b.height, Double(r.confidence)].map { ($0 * 1000).rounded() / 1000 }
    }
    frames.append([(t * 1000).rounded() / 1000, boxes])
    if Date().timeIntervalSince(lastLog) > 30 {
        FileHandle.standardError.write("\(Int(t)) / \(Int(duration)) s\n".data(using: .utf8)!)
        lastLog = Date()
    }
}
guard reader.status == .completed else { print("čitanje nije uspjelo: \(String(describing: reader.error))"); exit(2) }
let json: [String: Any] = ["step": step, "w": size.width, "h": size.height, "frames": frames]
try JSONSerialization.data(withJSONObject: json).write(to: URL(fileURLWithPath: args[2]))
print("gotovo: \(frames.count) frameova, \(args[2])")
