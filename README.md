# Rainy Studio

Rainy 75 的浏览器网页驱动。用桌面版 Chrome 或 Edge 打开 GitHub Pages 站点，点击“连接键盘”并授权 WebHID 设备，无需安装本地服务。

目前支持文件包所对应的 Rainy 75 VIA 固件，内置 RGB／无光版与 USB／2.4G 接收器定义。连接时会核对 VIA 协议版本和层数。RGB 与无光版共用设备 ID，请按实际型号选择。其他固件、其他型号以及其他实体键盘批次尚未完成验证。

网页不会自动刷写固件；编辑后的设置只有在点击“保存到键盘”后才会写入。蓝牙、电量读取、固件升级和宏编辑尚未提供。

网页文件位于本仓库根目录。GitHub Pages 选择 `main` 分支和 `/(root)` 发布即可。WebHID 授权属于当前网站来源，首次连接设备需要用户在浏览器中选择并授权。

本项目独立制作。视觉参考 [ClickSync](https://github.com/Nuitfanee/ClickSync)，协议参考 [VIA](https://github.com/the-via/app)。
