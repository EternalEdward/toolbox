import { Link } from 'react-router-dom'

const TOOLS = [
  {
    path: '/compress',
    icon: '🗜️',
    title: '图片压缩',
    description: '调整压缩质量，实时对比前后大小，压缩图片不损失视觉质量。',
    color: 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100',
  },
  {
    path: '/convert',
    icon: '🔄',
    title: '格式转换',
    description: 'PNG、JPEG、WebP、AVIF、BMP 之间自由转换，支持批量处理。',
    color: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  },
  {
    path: '/pdf',
    icon: '📄',
    title: '图片转 PDF',
    description: '多张图片合成一个 PDF，支持拖拽排序，可选 A4 / Letter 纸张。',
    color: 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100',
  },
  {
    path: '/remove-bg',
    icon: '🎨',
    title: '照片换背景',
    description: 'AI 智能抠图，替换白/蓝/红背景，或自定义颜色，适合证件照。',
    color: 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100',
  },
  {
    path: '/scan',
    icon: '📷',
    title: '扫描证件',
    description: '拍照上传文档，自动矫正扭曲变形并去除背景，生成平整扫描件。',
    color: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
  },
]

export default function HomePage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          图片工具箱
        </h1>
        <p className="text-gray-500 text-lg">
          所有处理均在浏览器本地完成，文件不会上传到任何服务器，保障你的隐私安全。
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {TOOLS.map(tool => (
          <Link
            key={tool.path}
            to={tool.path}
            className={`p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer ${tool.color}`}
          >
            <div className="text-4xl mb-3">{tool.icon}</div>
            <h2 className="text-xl font-semibold mb-2">{tool.title}</h2>
            <p className="text-sm opacity-80">{tool.description}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 p-6 bg-gray-50 rounded-xl border border-gray-200">
        <h3 className="font-semibold text-gray-700 mb-2">🔒 隐私说明</h3>
        <p className="text-sm text-gray-500 leading-relaxed">
          本网站是纯前端应用，所有图片处理（压缩、转换、PDF生成、AI抠图）均在你的浏览器中完成。
          你的图片<strong>从不离开你的电脑</strong>，不会被上传到任何服务器。
          你可以打开浏览器开发者工具（F12）→ Network 面板验证：处理过程中没有任何上传请求。
        </p>
      </div>
    </div>
  )
}
