const JD = {};
//job: server, bartender, receptionist, cashier [3] (Mã Mây,Iris)
JD['server'] = {
    3: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        const text = `${storeName} tại ${address} hiện đang "nhắn tìm đồng đội"\n
JOBO nhận được thông báo khẩn "nhắn tìm đồng đội" từ biệt đội ${storeName}:\n
   🏆Vị trí: ${jobName}\n
   ${salary}${working_type}${time}${description}\n${figure}${unit}${experience}${sex}
Bỏ ra 1 phút để tìm hiểu thêm thông tin và gia nhập đồng đội ngay hôm nay tại: ${jobUrl}\n
Các bạn chỉ cần hoàn thành hồ sơ tại link trên, ${storeName} sẽ liên hệ lại ngay và đi làm luôn!\n
Nếu khó khăn cứ cmt ngay dưới hoặc liên hệ ${contact} nhé!\n\n
------------------------------------\n
Nếu cơ sở đó không thuận tiện cho bạn đi lại, tham khảo các cơ sở khác tại : ${storeUrl}\n\n${deadline}`;
        return text;
    },
    4: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        const text = `TUYỂN DỤNG TẠI NHÀ HÀNG ${storeName}\n
SANG TUẦN ĐI LÀM LUÔN\n\n
   🏆Địa chỉ: ${address}\n
   🏆Vị trí tuyển dụng: ${jobName}\n
${time}
${salary}${figure}${unit}${experience}${sex}
Có chế độ hưởng, thưởng,những ngày lễ...\n\n
#KHÔNG YÊU CẦU KINH NGHIỆM\n\n
#ỨNG TUYỂN TẠI: ${jobUrl} (Ghi đúng số điện thoại để mình liên hệ lại)\n
Liên hệ ngay : ${contact}\n\n${deadline}`;
        return text;
    },
    5: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        const text = `Có bạn nào quanh khu vực ${address}, mình cần tuyển GẤP nhân viên ${jobName} tại ${storeName}\n
   ${salary}${working_type}${time}${description}${figure}${unit}${experience}${sex}
Nếu chưa rõ các bạn có thể xem cụ thể tại đây ${jobUrl} và ứng tuyển theo link đó để mình xem trước thông tin và hẹn lịch đi phỏng vấn và đi làm ngay.\n
Mình cần tuyển rất gấp , bạn nào có bạn bè cần tìm việc ở ${address} thì giới thiệu, tag vào giúp mình với nha. Mình cảm ơn.\n
Liên hệ ${contact}.\n\n${deadline}`;
        return text;
    },
    6: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        const text = `Mình thấy trong group có nhiều bạn đăng tin tìm việc ở quận ${address}, mình cũng cần tuyển rất GẤP cho Nhà hàng mình tại ${address} mà sao không gặp được nhau nhỉ.\n
Hy vọng tin này đến được các bạn cần tìm việc!\n\n
  ${storeName}\n
  🏆Địa chỉ: ${address}\n
  🏆Vị trí cần tuyển: ${jobName}\n
  ${figure}${unit}
${salary}
${time}\n${experience}${sex}
Môi trường làm việc của Nhà hàng mình nhiều bạn trẻ, vui vẻ và năng động nên luôn luôn chào đón các bạn mới gia nhập đội ngũ nhé!\n
Các bạn có thể liên hệ ${contact}  để trao đổi hoặc nếu có thể thì hoàn thành đơn ứng tuyển tại link này ${jobUrl} để tiết kiệm thời gian cho cả hai luôn!\n\n
Mình còn tuyển cho nhiều cơ sở nữa trên hầu hết quận ở Hà Nội nên nếu cơ sở này không phù hợp để đi lại thì vẫn có thể điền link trên rồi mình xếp vào vị trí phù hợp gần nhà bạn.\n\n${deadline}
Mình cảm ơn nhé!`;
        return text;
    },
    7: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        const text = `Tuyển gấp cho Nhà hàng ăn cao cấp tại ${address} nhiều vị trí:\n\n
${salary}\n
${time}\n${figure}${unit}${experience}${sex}
#KHÔNG_YÊU_CẦU_KINH_NGHIỆM\n
-Bảo vệ\n
-Thu ngân\n
-Tạp vụ\n
-Phục vụ\n
-Lễ tân\n
-Giám sát/ Trưởng bàn\n
-....\n\n
#ƯU_TIÊN_GẮN_BÓ_LÂU_DÀI\n
#Nếu có thắc mắc gì cmt mình giải đáp hoặc liên hệ ${contact}\n
#Hoàn thành link online này thay cho hồ sơ xin việc bình thường để tiện Nhà hàng xem trước và hẹn lịch đi làm ngay cho bạn: ${jobUrl}\n
Lưu ý ghi đúng số điện thoại và địa chỉ để mình sắp xếp vào cơ sở gần nhất.\n\n${deadline}`;
        return text;
    },
    8: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        const text = `Nhà hàng mình đang làm cần tuyển nên mình đăng giúp!\n\n
${storeName}\n
🏆Địa chỉ ở: ${address}\n
${time}\n${figure}${unit}
${salary}${experience}${sex}
Không yêu cầu kinh nghiệm và sẽ được đào tạo các bạn ạ, chỉ cần ham học hỏi là được\n\n
Môi trường làm việc trẻ trung và được giúp đỡ tạo điều kiện rất nhiều
Có chế độ thưởng, lương, BHXH (nếu làm lâu dài có BHXH ,...)\n\n
Các bạn muốn hỏi thêm liên hệ ${contact} nhé\n
Mình ghi thông tin chi tiết tại link: ${jobUrl}, các bạn xem kĩ và nhấn ứng tuyển luôn ở đó ,lập hồ sơ rồi chị quản lý liên hệ đi làm ngay nhé vì nhà hàng tuyển gấp.\nCác bạn đi qua giúp mình chấm cho đỡ bài nhé, mình cảm ơn.\n\n${deadline}`;
        return text;
    },
    9: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        const text = `Không có công việc nào việc nhẹ nhàn hạ lương cao đâu các bạn ạ, Sinh viên xác định kiếm thêm thu nhập thì chịu khó hơi vất vả một tý.\n\n
Mình có tuyển nhân viên ${jobName} ở ${storeName} tại (địa chỉ), công việc sẽ không nhàn nhưng đảm bảo chân chính và ổn định\n
${time}${figure}${unit}
${salary}${experience}${sex}
Sẽ tạo điều kiện cho sinh viên muốn đi làm kiếm thêm thu nhập vì mình biết các bạn vừa học, vừa làm rất khó xếp lịch\n\n
Các bạn muốn hỏi thêm liên hệ ${contact} nhé\n
Mình ghi thông tin chi tiết tại link: ${jobUrl}, các bạn xem kĩ và nhấn ứng tuyển luôn ở đó ,lập hồ sơ rồi mình liên hệ đi làm ngay nhé vì nhà hàng tuyển gấp.\n
Các bạn đi qua giúp mình chấm cho đỡ bài nhé, mình cảm ơn.\n\n${deadline}`;
        return text;
    },
    10: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        const text = `Đối với một nhà hàng, món ăn ngon và hấp dẫn chưa đủ sức thuyết phục thực khách hoàn toàn. Yếu tố nội thất sang trọng, bài trí đẹp mắt và cung cách phục vụ chuyên nghiệp cũng góp phần rất quan trọng trong việc “giữ chân” khách hàng. Hãy để bản thân trở thành một phần lý do với nhà hàng chúng tôi.\n
${storeName} tìm đồng đội:\n\n
🏆Vị trí ${jobName}${figure}${unit}
${time}${salary}${experience}${sex}
Phụ cấp 1 bữa trong ngày, có cơ hội làm việc trong môi trường nhà hàng chuyên nghiệp, giúp trau dồi tiếng Anh, tiếng Hoa.\n
Truy cập vào đường ${jobUrl} và ứng tuyển\n
Hoặc liên hệ số điện thoại: ${contact}\n
Bên mình sẽ liên lạc và tư vấn trực tiếp cho các bạn nhé!\n\n${deadline}`;
        return text;
    }
}

JD['business'] = {
    3: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        if (storeName.match(/JOBO|Jobo/g)) storeName = `CÔNG TY CÔNG NGHỆ JOBO`;
        const text = `${storeName} TÌM CỘNG SỰ - ${jobName.toUpperCase()}👩‍💻👨‍💻\n
🏆Vị trí của bạn sẽ là: ${jobName}\n
${description}\n
${salary}${figure}${experience}${sex}${unit}
🏆Hãy đi tiếp chặng đường mới cùng ${storeName} tại:\n
🎐Cách 1: Vào link: ${jobUrl} và nhấn "Ứng tuyển không cần CV"\n
🎐Cách 2: Nộp CV vào mail HR@joboapp.com\n
${storeName} chờ bạn và đang rất nóng lòng đóng chào các bạn join team đó, nhanh nhanh nhé!✌️✌️\n🐳${deadline}`;
        return text;
    },
    4: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        const text = `Cơ hội trở thành ${jobName} dành cho các bạn mới tốt nghiệp.\n${storeName} địa chỉ ${address}.\n${salary}
${description}${figure}${experience}${sex}${unit}
Bạn nào cảm thấy phù hợp có thể gửi CV về trangnt@vjl.com.vn
Thông tin chi tiết comment bên dưới hoặc vui lòng inbox mình ;)${deadline}`;
        return text;
    },
    5: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        let descriptionStr = '';
        let salaryStr = '';
        if (description) descriptionStr = `Cùng nhiều phúc lợi hấp dẫn: ${description.replace('🏆Mô tả công việc: ','')}`;
        if (salary) salaryStr = `Với mức lương lên đến ${salary.replace('🏆Lương khởi điểm: ', '').replace('\n', '')}/tháng\n`;

        const text = `Họ cười tôi vì tôi khác họ, Tôi cười họ vì họ giống nhau.
Điên rồ là gì ngoài: Làm những gì người khác làm mà mong kết quả khác đi.
Khi mà mọi người không ai dám đương đầu và chấp nhận thử thách, thì chính là lúc bạn phải ra tay.
Hãy ra nhập với chúng tôi, ${storeName} tuyển dụng:
🏆Vị trí ${jobName}.
${salaryStr}
${descriptionStr}${figure}${experience}${sex}${unit}
Đừng để suy nghĩ của người khác khiến bạn mất đi một cơ hội phát triển bản thân.
Truy cập vào đường link: ${jobUrl}
Hoặc liên hệ số điện thoại: ${contact}
Để được tư vấn trực tiếp từ nhà tuyển dụng của chúng tôi.\n${deadline}`;
        return text;
    }
}

JD['sale'] = {
    3: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        let descriptionStr = '';
        let salaryStr = '';

        const text = `Tuyển ${jobName} ${storeName} tại ${address}.
${time}
${salary}
${description}${figure}${experience}${sex}${unit}
L/H: ${contact} nếu các bạn có thắc mắc
Hoàn thành đơn đăng ký tại: ${jobUrl}
(bạn nào hoàn thành xong thì cmt ở dưới để mình check hoặc không hoàn thành được thì cmt sđt ở dưới để mình liên hệ lại)\n${deadline}`;
        return text;
    },
    4: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        let descriptionStr = '';
        let salaryStr = '';

        const text = `Có bạn nào muốn làm ${jobName} không nhỉ?
Mình tuyển cho ${storeName}
${salary}
${time}${figure}${experience}${sex}${unit}
Khuyến khích các bạn có định hướng, thiện chí làm ${jobName}
Liên hệ: ${contact}

P/s: Bạn nào nghiêm túc làm thì đk pv nhé, vì nhiều bạn đăng kí nhưng mình hẹn lại k đi pv làm rất mất thời gian
Hoàn thành đơn đăng ký tại: ${jobUrl}
${deadline}
Mình cảm ơn nhiều!`;
        return text;
    },
    5: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        let descriptionStr = '';
        let salaryStr = '';

        const text = `[TUYỂN GẤP] – VỊ TRÍ ${jobName.toUpperCase()} tại ${storeName}
${salary}
${description}
🏆Làm việc tại chi nhánh: ${address}
${figure}${experience}${sex}${unit}
Nhanh tay ứng tuyển, ưu tiên những bạn ứng tuyển đầu vì số lượng tuyển có hạn.
Click link này để ứng tuyển vị trí của cửa hàng mình: ${jobUrl}
Bên mình sẽ liên lạc lại những ứng viên phù hợp.
${deadline}`;
        return text;
    },
    6: function ({ storeName, address = '', jobName = '', salary = '', working_type = '', time = '', jobUrl = '', storeUrl = '', figure = '', unit = '', experience = '', sex = '', deadline = '', description = '', contact = '0971456089 (Mai)' }) {
        let descriptionStr = '';
        let salaryStr = '';

        const text = `Công việc ổn định dành cho các Chị em!
${jobName} tại ${storeName} ở ${address}.
${salary}${description}${figure}${experience}${sex}${unit}
Mong bạn nào thật sự có nhu cầu tìm việc và mong muốn làm lâu dài thì theo đường link này đăng kí: ${jobUrl}
Hoặc liên hệ theo số điện thoại này: ${contact}
Bên mình sẽ liên lạc ngay với các ứng viên phù hợp.
${deadline}
Các bạn đăng ký nghiêm túc nhé, cảm ơn các bạn!`;
        return text;
    }
}

module.exports = { JD };