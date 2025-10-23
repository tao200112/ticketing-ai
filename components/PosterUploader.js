'use client'

import { useState } from 'react'
import { hasSupabase } from '../lib/safeEnv'

export default function PosterUploader({ 
  onUpload, 
  onPreview, 
  className = '',
  maxSize = 5 * 1024 * 1024, // 5MB
  acceptedTypes = ['image/jpeg', 'image/png', 'image/webp']
}) {
  const [dragActive, setDragActive] = useState(false)
  const [preview, setPreview] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleFile = (file) => {
    setError('')
    
    // 验证文件类型
    if (!acceptedTypes.includes(file.type)) {
      setError('请上传 JPG、PNG 或 WebP 格式的图片')
      return
    }
    
    // 验证文件大小
    if (file.size > maxSize) {
      setError(`文件大小不能超过 ${Math.round(maxSize / 1024 / 1024)}MB`)
      return
    }

    // 创建预览
    const reader = new FileReader()
    reader.onload = (e) => {
      const previewUrl = e.target.result
      setPreview(previewUrl)
      if (onPreview) {
        onPreview(previewUrl)
      }
    }
    reader.readAsDataURL(file)

    // 尝试上传到 Supabase
    if (hasSupabase()) {
      uploadToSupabase(file)
    } else {
      // 仅本地预览
      if (onUpload) {
        onUpload({
          file,
          url: null,
          success: false,
          message: 'Supabase 不可用，仅本地预览'
        })
      }
    }
  }

  const uploadToSupabase = async (file) => {
    setUploading(true)
    try {
      // 这里可以添加真实的 Supabase Storage 上传逻辑
      // 暂时模拟上传过程
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const mockUrl = `https://example.com/uploads/${Date.now()}_${file.name}`
      
      if (onUpload) {
        onUpload({
          file,
          url: mockUrl,
          success: true,
          message: '上传成功'
        })
      }
    } catch (error) {
      console.error('上传失败:', error)
      if (onUpload) {
        onUpload({
          file,
          url: null,
          success: false,
          message: '上传失败'
        })
      }
    } finally {
      setUploading(false)
    }
  }

  const handleDrag = (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleInputChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const clearPreview = () => {
    setPreview(null)
    setError('')
    if (onPreview) {
      onPreview(null)
    }
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <label className="block text-sm font-medium text-slate-300 mb-2">
        活动海报
      </label>
      
      {preview ? (
        <div className="relative">
          <div className="relative rounded-lg overflow-hidden bg-slate-800">
            <img
              src={preview}
              alt="海报预览"
              className="w-full h-64 object-cover"
            />
            <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
              <button
                onClick={clearPreview}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                删除
              </button>
            </div>
          </div>
          
          {uploading && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="bg-white rounded-lg p-4 flex items-center space-x-3">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
                <span className="text-slate-800">上传中...</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive 
              ? 'border-purple-500 bg-purple-500/10' 
              : 'border-slate-600 hover:border-slate-500'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            type="file"
            accept={acceptedTypes.join(',')}
            onChange={handleInputChange}
            className="hidden"
            id="poster-upload"
          />
          <label
            htmlFor="poster-upload"
            className="cursor-pointer"
          >
            <div className="space-y-4">
              <div className="text-4xl">📸</div>
              <div>
                <div className="text-white font-medium mb-1">
                  点击上传或拖拽文件到此处
                </div>
                <div className="text-sm text-slate-400">
                  支持 JPG、PNG、WebP 格式，最大 5MB
                </div>
              </div>
              <div className="text-xs text-slate-500">
                {hasSupabase() ? '✓ 支持云端存储' : '⚠ 仅本地预览'}
              </div>
            </div>
          </label>
        </div>
      )}
      
      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}
    </div>
  )
}
