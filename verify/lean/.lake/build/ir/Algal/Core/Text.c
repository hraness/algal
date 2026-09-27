// Lean compiler output
// Module: Algal.Core.Text
// Imports: public import Init public meta import Init public import Init
#include <lean/lean.h>
#if defined(__clang__)
#pragma clang diagnostic ignored "-Wunused-parameter"
#pragma clang diagnostic ignored "-Wunused-label"
#elif defined(__GNUC__) && !defined(__CLANG__)
#pragma GCC diagnostic ignored "-Wunused-parameter"
#pragma GCC diagnostic ignored "-Wunused-label"
#pragma GCC diagnostic ignored "-Wunused-but-set-variable"
#endif
#ifdef __cplusplus
extern "C" {
#endif
lean_object* lean_string_data(lean_object*);
uint8_t lean_uint32_dec_eq(uint32_t, uint32_t);
lean_object* lean_uint32_to_nat(uint32_t);
uint8_t lean_nat_dec_le(lean_object*, lean_object*);
lean_object* lean_nat_mul(lean_object*, lean_object*);
lean_object* lean_nat_add(lean_object*, lean_object*);
lean_object* lean_nat_sub(lean_object*, lean_object*);
uint8_t lean_nat_dec_lt(lean_object*, lean_object*);
lean_object* lean_mk_empty_array_with_capacity(lean_object*);
lean_object* lean_array_to_list(lean_object*);
lean_object* lean_nat_shiftr(lean_object*, lean_object*);
lean_object* lean_nat_mod(lean_object*, lean_object*);
lean_object* l_List_foldl___at___00Array_appendList_spec__0___redArg(lean_object*, lean_object*);
uint8_t lean_nat_dec_eq(lean_object*, lean_object*);
uint32_t l_Char_ofNat(lean_object*);
uint8_t l_instDecidableEqOrdering(uint8_t, uint8_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_utf16Char(uint32_t);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_utf16Char___boxed(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Core_Text_utf16_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Core_Text_utf16_spec__0___boxed(lean_object*, lean_object*);
static const lean_array_object lp_algalVerification_Algal_Core_Text_utf16___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_array_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 246}, .m_size = 0, .m_capacity = 0, .m_data = {}};
static const lean_object* lp_algalVerification_Algal_Core_Text_utf16___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Text_utf16___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_utf16(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_decodeChar(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChar_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChar_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Core_Text_decodeChars___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Text_decodeChars___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Text_decodeChars___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_decodeChars(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_decodeChars___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__3_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__3_splitter___redArg___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__3_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__3_splitter___boxed(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__1_splitter___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__1_splitter(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_parseDigits(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_parseDigits___boxed(lean_object*, lean_object*);
static const lean_ctor_object lp_algalVerification_Algal_Core_Text_arrayIndex___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_ctor_object) + sizeof(void*)*1 + 0, .m_other = 1, .m_tag = 1}, .m_objs = {((lean_object*)(((size_t)(0) << 1) | 1))}};
static const lean_object* lp_algalVerification_Algal_Core_Text_arrayIndex___closed__0 = (const lean_object*)&lp_algalVerification_Algal_Core_Text_arrayIndex___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_arrayIndex(lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_List_compareLex___at___00Algal_Core_Text_keyOrder_spec__0(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_compareLex___at___00Algal_Core_Text_keyOrder_spec__0___boxed(lean_object*, lean_object*);
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Text_keyOrder(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_keyOrder___boxed(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_insertKey(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_canonicalKeys(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_insertKey_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_insertKey_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_utf16Char(uint32_t v_c_1_){
_start:
{
lean_object* v___x_2_; lean_object* v___x_3_; uint8_t v___x_4_; 
v___x_2_ = lean_uint32_to_nat(v_c_1_);
v___x_3_ = lean_unsigned_to_nat(65536u);
v___x_4_ = lean_nat_dec_lt(v___x_2_, v___x_3_);
if (v___x_4_ == 0)
{
lean_object* v___x_5_; lean_object* v___x_6_; lean_object* v___x_7_; lean_object* v___x_8_; lean_object* v___x_9_; lean_object* v___x_10_; lean_object* v___x_11_; lean_object* v___x_12_; lean_object* v___x_13_; lean_object* v___x_14_; lean_object* v___x_15_; lean_object* v___x_16_; 
v___x_5_ = lean_unsigned_to_nat(55296u);
v___x_6_ = lean_nat_sub(v___x_2_, v___x_3_);
lean_dec(v___x_2_);
v___x_7_ = lean_unsigned_to_nat(1024u);
v___x_8_ = lean_unsigned_to_nat(10u);
v___x_9_ = lean_nat_shiftr(v___x_6_, v___x_8_);
v___x_10_ = lean_nat_add(v___x_5_, v___x_9_);
lean_dec(v___x_9_);
v___x_11_ = lean_unsigned_to_nat(56320u);
v___x_12_ = lean_nat_mod(v___x_6_, v___x_7_);
lean_dec(v___x_6_);
v___x_13_ = lean_nat_add(v___x_11_, v___x_12_);
lean_dec(v___x_12_);
v___x_14_ = lean_box(0);
v___x_15_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_15_, 0, v___x_13_);
lean_ctor_set(v___x_15_, 1, v___x_14_);
v___x_16_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_16_, 0, v___x_10_);
lean_ctor_set(v___x_16_, 1, v___x_15_);
return v___x_16_;
}
else
{
lean_object* v___x_17_; lean_object* v___x_18_; 
v___x_17_ = lean_box(0);
v___x_18_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_18_, 0, v___x_2_);
lean_ctor_set(v___x_18_, 1, v___x_17_);
return v___x_18_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_utf16Char___boxed(lean_object* v_c_19_){
_start:
{
uint32_t v_c_boxed_20_; lean_object* v_res_21_; 
v_c_boxed_20_ = lean_unbox_uint32(v_c_19_);
lean_dec(v_c_19_);
v_res_21_ = lp_algalVerification_Algal_Core_Text_utf16Char(v_c_boxed_20_);
return v_res_21_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Core_Text_utf16_spec__0(lean_object* v_a_22_, lean_object* v_a_23_){
_start:
{
if (lean_obj_tag(v_a_22_) == 0)
{
lean_object* v___x_24_; 
v___x_24_ = lean_array_to_list(v_a_23_);
return v___x_24_;
}
else
{
lean_object* v_head_25_; lean_object* v_tail_26_; uint32_t v___x_27_; lean_object* v___x_28_; lean_object* v___x_29_; 
v_head_25_ = lean_ctor_get(v_a_22_, 0);
v_tail_26_ = lean_ctor_get(v_a_22_, 1);
v___x_27_ = lean_unbox_uint32(v_head_25_);
v___x_28_ = lp_algalVerification_Algal_Core_Text_utf16Char(v___x_27_);
v___x_29_ = l_List_foldl___at___00Array_appendList_spec__0___redArg(v_a_23_, v___x_28_);
v_a_22_ = v_tail_26_;
v_a_23_ = v___x_29_;
goto _start;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Core_Text_utf16_spec__0___boxed(lean_object* v_a_31_, lean_object* v_a_32_){
_start:
{
lean_object* v_res_33_; 
v_res_33_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Core_Text_utf16_spec__0(v_a_31_, v_a_32_);
lean_dec(v_a_31_);
return v_res_33_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_utf16(lean_object* v_s_36_){
_start:
{
lean_object* v___x_37_; lean_object* v___x_38_; lean_object* v___x_39_; 
v___x_37_ = lean_string_data(v_s_36_);
v___x_38_ = ((lean_object*)(lp_algalVerification_Algal_Core_Text_utf16___closed__0));
v___x_39_ = lp_algalVerification___private_Init_Data_List_Impl_0__List_flatMapTR_go___at___00Algal_Core_Text_utf16_spec__0(v___x_37_, v___x_38_);
lean_dec(v___x_37_);
return v___x_39_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_decodeChar(lean_object* v_x_40_){
_start:
{
if (lean_obj_tag(v_x_40_) == 0)
{
lean_object* v___x_41_; 
v___x_41_ = lean_box(0);
return v___x_41_;
}
else
{
lean_object* v_head_42_; lean_object* v_tail_43_; lean_object* v___x_45_; uint8_t v_isShared_46_; uint8_t v_isSharedCheck_91_; 
v_head_42_ = lean_ctor_get(v_x_40_, 0);
v_tail_43_ = lean_ctor_get(v_x_40_, 1);
v_isSharedCheck_91_ = !lean_is_exclusive(v_x_40_);
if (v_isSharedCheck_91_ == 0)
{
v___x_45_ = v_x_40_;
v_isShared_46_ = v_isSharedCheck_91_;
goto v_resetjp_44_;
}
else
{
lean_inc(v_tail_43_);
lean_inc(v_head_42_);
lean_dec(v_x_40_);
v___x_45_ = lean_box(0);
v_isShared_46_ = v_isSharedCheck_91_;
goto v_resetjp_44_;
}
v_resetjp_44_:
{
lean_object* v___x_54_; uint8_t v___x_86_; 
v___x_54_ = lean_unsigned_to_nat(55296u);
v___x_86_ = lean_nat_dec_lt(v_head_42_, v___x_54_);
if (v___x_86_ == 0)
{
lean_object* v___x_87_; uint8_t v___x_88_; 
v___x_87_ = lean_unsigned_to_nat(57343u);
v___x_88_ = lean_nat_dec_lt(v___x_87_, v_head_42_);
if (v___x_88_ == 0)
{
lean_del_object(v___x_45_);
goto v___jp_55_;
}
else
{
lean_object* v___x_89_; uint8_t v___x_90_; 
v___x_89_ = lean_unsigned_to_nat(65536u);
v___x_90_ = lean_nat_dec_lt(v_head_42_, v___x_89_);
if (v___x_90_ == 0)
{
lean_del_object(v___x_45_);
goto v___jp_55_;
}
else
{
goto v___jp_47_;
}
}
}
else
{
goto v___jp_47_;
}
v___jp_47_:
{
uint32_t v___x_48_; lean_object* v___x_49_; lean_object* v___x_51_; 
v___x_48_ = l_Char_ofNat(v_head_42_);
lean_dec(v_head_42_);
v___x_49_ = lean_box_uint32(v___x_48_);
if (v_isShared_46_ == 0)
{
lean_ctor_set_tag(v___x_45_, 0);
lean_ctor_set(v___x_45_, 0, v___x_49_);
v___x_51_ = v___x_45_;
goto v_reusejp_50_;
}
else
{
lean_object* v_reuseFailAlloc_53_; 
v_reuseFailAlloc_53_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_53_, 0, v___x_49_);
lean_ctor_set(v_reuseFailAlloc_53_, 1, v_tail_43_);
v___x_51_ = v_reuseFailAlloc_53_;
goto v_reusejp_50_;
}
v_reusejp_50_:
{
lean_object* v___x_52_; 
v___x_52_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_52_, 0, v___x_51_);
return v___x_52_;
}
}
v___jp_55_:
{
if (lean_obj_tag(v_tail_43_) == 0)
{
lean_object* v___x_56_; 
lean_dec(v_head_42_);
v___x_56_ = lean_box(0);
return v___x_56_;
}
else
{
lean_object* v_head_57_; lean_object* v_tail_58_; lean_object* v___x_60_; uint8_t v_isShared_61_; uint8_t v_isSharedCheck_85_; 
v_head_57_ = lean_ctor_get(v_tail_43_, 0);
v_tail_58_ = lean_ctor_get(v_tail_43_, 1);
v_isSharedCheck_85_ = !lean_is_exclusive(v_tail_43_);
if (v_isSharedCheck_85_ == 0)
{
v___x_60_ = v_tail_43_;
v_isShared_61_ = v_isSharedCheck_85_;
goto v_resetjp_59_;
}
else
{
lean_inc(v_tail_58_);
lean_inc(v_head_57_);
lean_dec(v_tail_43_);
v___x_60_ = lean_box(0);
v_isShared_61_ = v_isSharedCheck_85_;
goto v_resetjp_59_;
}
v_resetjp_59_:
{
uint8_t v___x_62_; 
v___x_62_ = lean_nat_dec_le(v___x_54_, v_head_42_);
if (v___x_62_ == 0)
{
lean_object* v___x_63_; 
lean_del_object(v___x_60_);
lean_dec(v_tail_58_);
lean_dec(v_head_57_);
lean_dec(v_head_42_);
v___x_63_ = lean_box(0);
return v___x_63_;
}
else
{
lean_object* v___x_64_; uint8_t v___x_65_; 
v___x_64_ = lean_unsigned_to_nat(56320u);
v___x_65_ = lean_nat_dec_lt(v_head_42_, v___x_64_);
if (v___x_65_ == 0)
{
lean_object* v___x_66_; 
lean_del_object(v___x_60_);
lean_dec(v_tail_58_);
lean_dec(v_head_57_);
lean_dec(v_head_42_);
v___x_66_ = lean_box(0);
return v___x_66_;
}
else
{
uint8_t v___x_67_; 
v___x_67_ = lean_nat_dec_le(v___x_64_, v_head_57_);
if (v___x_67_ == 0)
{
lean_object* v___x_68_; 
lean_del_object(v___x_60_);
lean_dec(v_tail_58_);
lean_dec(v_head_57_);
lean_dec(v_head_42_);
v___x_68_ = lean_box(0);
return v___x_68_;
}
else
{
lean_object* v___x_69_; uint8_t v___x_70_; 
v___x_69_ = lean_unsigned_to_nat(57344u);
v___x_70_ = lean_nat_dec_lt(v_head_57_, v___x_69_);
if (v___x_70_ == 0)
{
lean_object* v___x_71_; 
lean_del_object(v___x_60_);
lean_dec(v_tail_58_);
lean_dec(v_head_57_);
lean_dec(v_head_42_);
v___x_71_ = lean_box(0);
return v___x_71_;
}
else
{
lean_object* v___x_72_; lean_object* v___x_73_; lean_object* v___x_74_; lean_object* v___x_75_; lean_object* v___x_76_; lean_object* v___x_77_; lean_object* v___x_78_; uint32_t v___x_79_; lean_object* v___x_80_; lean_object* v___x_82_; 
v___x_72_ = lean_unsigned_to_nat(65536u);
v___x_73_ = lean_nat_sub(v_head_42_, v___x_54_);
lean_dec(v_head_42_);
v___x_74_ = lean_unsigned_to_nat(1024u);
v___x_75_ = lean_nat_mul(v___x_73_, v___x_74_);
lean_dec(v___x_73_);
v___x_76_ = lean_nat_add(v___x_72_, v___x_75_);
lean_dec(v___x_75_);
v___x_77_ = lean_nat_sub(v_head_57_, v___x_64_);
lean_dec(v_head_57_);
v___x_78_ = lean_nat_add(v___x_76_, v___x_77_);
lean_dec(v___x_77_);
lean_dec(v___x_76_);
v___x_79_ = l_Char_ofNat(v___x_78_);
lean_dec(v___x_78_);
v___x_80_ = lean_box_uint32(v___x_79_);
if (v_isShared_61_ == 0)
{
lean_ctor_set_tag(v___x_60_, 0);
lean_ctor_set(v___x_60_, 0, v___x_80_);
v___x_82_ = v___x_60_;
goto v_reusejp_81_;
}
else
{
lean_object* v_reuseFailAlloc_84_; 
v_reuseFailAlloc_84_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v_reuseFailAlloc_84_, 0, v___x_80_);
lean_ctor_set(v_reuseFailAlloc_84_, 1, v_tail_58_);
v___x_82_ = v_reuseFailAlloc_84_;
goto v_reusejp_81_;
}
v_reusejp_81_:
{
lean_object* v___x_83_; 
v___x_83_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_83_, 0, v___x_82_);
return v___x_83_;
}
}
}
}
}
}
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChar_match__1_splitter___redArg(lean_object* v_ns_92_, lean_object* v_h__1_93_, lean_object* v_h__2_94_){
_start:
{
if (lean_obj_tag(v_ns_92_) == 0)
{
lean_object* v___x_95_; lean_object* v___x_96_; 
lean_dec(v_h__2_94_);
v___x_95_ = lean_box(0);
v___x_96_ = lean_apply_1(v_h__1_93_, v___x_95_);
return v___x_96_;
}
else
{
lean_object* v_head_97_; lean_object* v_tail_98_; lean_object* v___x_99_; 
lean_dec(v_h__1_93_);
v_head_97_ = lean_ctor_get(v_ns_92_, 0);
lean_inc(v_head_97_);
v_tail_98_ = lean_ctor_get(v_ns_92_, 1);
lean_inc(v_tail_98_);
lean_dec_ref_known(v_ns_92_, 2);
v___x_99_ = lean_apply_2(v_h__2_94_, v_head_97_, v_tail_98_);
return v___x_99_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChar_match__1_splitter(lean_object* v_motive_100_, lean_object* v_ns_101_, lean_object* v_h__1_102_, lean_object* v_h__2_103_){
_start:
{
if (lean_obj_tag(v_ns_101_) == 0)
{
lean_object* v___x_104_; lean_object* v___x_105_; 
lean_dec(v_h__2_103_);
v___x_104_ = lean_box(0);
v___x_105_ = lean_apply_1(v_h__1_102_, v___x_104_);
return v___x_105_;
}
else
{
lean_object* v_head_106_; lean_object* v_tail_107_; lean_object* v___x_108_; 
lean_dec(v_h__1_102_);
v_head_106_ = lean_ctor_get(v_ns_101_, 0);
lean_inc(v_head_106_);
v_tail_107_ = lean_ctor_get(v_ns_101_, 1);
lean_inc(v_tail_107_);
lean_dec_ref_known(v_ns_101_, 2);
v___x_108_ = lean_apply_2(v_h__2_103_, v_head_106_, v_tail_107_);
return v___x_108_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_decodeChars(lean_object* v_x_111_, lean_object* v_x_112_){
_start:
{
lean_object* v_zero_115_; uint8_t v_isZero_116_; 
v_zero_115_ = lean_unsigned_to_nat(0u);
v_isZero_116_ = lean_nat_dec_eq(v_x_111_, v_zero_115_);
if (v_isZero_116_ == 1)
{
if (lean_obj_tag(v_x_112_) == 0)
{
goto v___jp_113_;
}
else
{
lean_object* v___x_117_; 
lean_dec_ref_known(v_x_112_, 2);
v___x_117_ = lean_box(0);
return v___x_117_;
}
}
else
{
if (lean_obj_tag(v_x_112_) == 0)
{
goto v___jp_113_;
}
else
{
lean_object* v___x_118_; 
v___x_118_ = lp_algalVerification_Algal_Core_Text_decodeChar(v_x_112_);
if (lean_obj_tag(v___x_118_) == 0)
{
lean_object* v___x_119_; 
v___x_119_ = lean_box(0);
return v___x_119_;
}
else
{
lean_object* v_val_120_; lean_object* v_fst_121_; lean_object* v_snd_122_; lean_object* v___x_124_; uint8_t v_isShared_125_; uint8_t v_isSharedCheck_140_; 
v_val_120_ = lean_ctor_get(v___x_118_, 0);
lean_inc(v_val_120_);
lean_dec_ref_known(v___x_118_, 1);
v_fst_121_ = lean_ctor_get(v_val_120_, 0);
v_snd_122_ = lean_ctor_get(v_val_120_, 1);
v_isSharedCheck_140_ = !lean_is_exclusive(v_val_120_);
if (v_isSharedCheck_140_ == 0)
{
v___x_124_ = v_val_120_;
v_isShared_125_ = v_isSharedCheck_140_;
goto v_resetjp_123_;
}
else
{
lean_inc(v_snd_122_);
lean_inc(v_fst_121_);
lean_dec(v_val_120_);
v___x_124_ = lean_box(0);
v_isShared_125_ = v_isSharedCheck_140_;
goto v_resetjp_123_;
}
v_resetjp_123_:
{
lean_object* v_one_126_; lean_object* v_n_127_; lean_object* v___x_128_; 
v_one_126_ = lean_unsigned_to_nat(1u);
v_n_127_ = lean_nat_sub(v_x_111_, v_one_126_);
v___x_128_ = lp_algalVerification_Algal_Core_Text_decodeChars(v_n_127_, v_snd_122_);
lean_dec(v_n_127_);
if (lean_obj_tag(v___x_128_) == 0)
{
lean_del_object(v___x_124_);
lean_dec(v_fst_121_);
return v___x_128_;
}
else
{
lean_object* v_val_129_; lean_object* v___x_131_; uint8_t v_isShared_132_; uint8_t v_isSharedCheck_139_; 
v_val_129_ = lean_ctor_get(v___x_128_, 0);
v_isSharedCheck_139_ = !lean_is_exclusive(v___x_128_);
if (v_isSharedCheck_139_ == 0)
{
v___x_131_ = v___x_128_;
v_isShared_132_ = v_isSharedCheck_139_;
goto v_resetjp_130_;
}
else
{
lean_inc(v_val_129_);
lean_dec(v___x_128_);
v___x_131_ = lean_box(0);
v_isShared_132_ = v_isSharedCheck_139_;
goto v_resetjp_130_;
}
v_resetjp_130_:
{
lean_object* v___x_134_; 
if (v_isShared_125_ == 0)
{
lean_ctor_set_tag(v___x_124_, 1);
lean_ctor_set(v___x_124_, 1, v_val_129_);
v___x_134_ = v___x_124_;
goto v_reusejp_133_;
}
else
{
lean_object* v_reuseFailAlloc_138_; 
v_reuseFailAlloc_138_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_138_, 0, v_fst_121_);
lean_ctor_set(v_reuseFailAlloc_138_, 1, v_val_129_);
v___x_134_ = v_reuseFailAlloc_138_;
goto v_reusejp_133_;
}
v_reusejp_133_:
{
lean_object* v___x_136_; 
if (v_isShared_132_ == 0)
{
lean_ctor_set(v___x_131_, 0, v___x_134_);
v___x_136_ = v___x_131_;
goto v_reusejp_135_;
}
else
{
lean_object* v_reuseFailAlloc_137_; 
v_reuseFailAlloc_137_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v_reuseFailAlloc_137_, 0, v___x_134_);
v___x_136_ = v_reuseFailAlloc_137_;
goto v_reusejp_135_;
}
v_reusejp_135_:
{
return v___x_136_;
}
}
}
}
}
}
}
}
v___jp_113_:
{
lean_object* v___x_114_; 
v___x_114_ = ((lean_object*)(lp_algalVerification_Algal_Core_Text_decodeChars___closed__0));
return v___x_114_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_decodeChars___boxed(lean_object* v_x_141_, lean_object* v_x_142_){
_start:
{
lean_object* v_res_143_; 
v_res_143_ = lp_algalVerification_Algal_Core_Text_decodeChars(v_x_141_, v_x_142_);
lean_dec(v_x_141_);
return v_res_143_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__3_splitter___redArg(lean_object* v_x_144_, lean_object* v_x_145_, lean_object* v_h__1_146_, lean_object* v_h__2_147_, lean_object* v_h__3_148_){
_start:
{
lean_object* v_zero_149_; uint8_t v_isZero_150_; 
v_zero_149_ = lean_unsigned_to_nat(0u);
v_isZero_150_ = lean_nat_dec_eq(v_x_144_, v_zero_149_);
if (v_isZero_150_ == 1)
{
lean_dec(v_h__3_148_);
if (lean_obj_tag(v_x_145_) == 0)
{
lean_object* v___x_151_; lean_object* v___x_152_; 
lean_dec(v_h__2_147_);
v___x_151_ = lean_box(0);
v___x_152_ = lean_apply_1(v_h__1_146_, v___x_151_);
return v___x_152_;
}
else
{
lean_object* v_head_153_; lean_object* v_tail_154_; lean_object* v___x_155_; 
lean_dec(v_h__1_146_);
v_head_153_ = lean_ctor_get(v_x_145_, 0);
lean_inc(v_head_153_);
v_tail_154_ = lean_ctor_get(v_x_145_, 1);
lean_inc(v_tail_154_);
lean_dec_ref_known(v_x_145_, 2);
v___x_155_ = lean_apply_2(v_h__2_147_, v_head_153_, v_tail_154_);
return v___x_155_;
}
}
else
{
lean_object* v_one_156_; lean_object* v_n_157_; lean_object* v___x_158_; 
lean_dec(v_h__2_147_);
lean_dec(v_h__1_146_);
v_one_156_ = lean_unsigned_to_nat(1u);
v_n_157_ = lean_nat_sub(v_x_144_, v_one_156_);
v___x_158_ = lean_apply_2(v_h__3_148_, v_n_157_, v_x_145_);
return v___x_158_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__3_splitter___redArg___boxed(lean_object* v_x_159_, lean_object* v_x_160_, lean_object* v_h__1_161_, lean_object* v_h__2_162_, lean_object* v_h__3_163_){
_start:
{
lean_object* v_res_164_; 
v_res_164_ = lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__3_splitter___redArg(v_x_159_, v_x_160_, v_h__1_161_, v_h__2_162_, v_h__3_163_);
lean_dec(v_x_159_);
return v_res_164_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__3_splitter(lean_object* v_motive_165_, lean_object* v_x_166_, lean_object* v_x_167_, lean_object* v_h__1_168_, lean_object* v_h__2_169_, lean_object* v_h__3_170_){
_start:
{
lean_object* v_zero_171_; uint8_t v_isZero_172_; 
v_zero_171_ = lean_unsigned_to_nat(0u);
v_isZero_172_ = lean_nat_dec_eq(v_x_166_, v_zero_171_);
if (v_isZero_172_ == 1)
{
lean_dec(v_h__3_170_);
if (lean_obj_tag(v_x_167_) == 0)
{
lean_object* v___x_173_; lean_object* v___x_174_; 
lean_dec(v_h__2_169_);
v___x_173_ = lean_box(0);
v___x_174_ = lean_apply_1(v_h__1_168_, v___x_173_);
return v___x_174_;
}
else
{
lean_object* v_head_175_; lean_object* v_tail_176_; lean_object* v___x_177_; 
lean_dec(v_h__1_168_);
v_head_175_ = lean_ctor_get(v_x_167_, 0);
lean_inc(v_head_175_);
v_tail_176_ = lean_ctor_get(v_x_167_, 1);
lean_inc(v_tail_176_);
lean_dec_ref_known(v_x_167_, 2);
v___x_177_ = lean_apply_2(v_h__2_169_, v_head_175_, v_tail_176_);
return v___x_177_;
}
}
else
{
lean_object* v_one_178_; lean_object* v_n_179_; lean_object* v___x_180_; 
lean_dec(v_h__2_169_);
lean_dec(v_h__1_168_);
v_one_178_ = lean_unsigned_to_nat(1u);
v_n_179_ = lean_nat_sub(v_x_166_, v_one_178_);
v___x_180_ = lean_apply_2(v_h__3_170_, v_n_179_, v_x_167_);
return v___x_180_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__3_splitter___boxed(lean_object* v_motive_181_, lean_object* v_x_182_, lean_object* v_x_183_, lean_object* v_h__1_184_, lean_object* v_h__2_185_, lean_object* v_h__3_186_){
_start:
{
lean_object* v_res_187_; 
v_res_187_ = lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__3_splitter(v_motive_181_, v_x_182_, v_x_183_, v_h__1_184_, v_h__2_185_, v_h__3_186_);
lean_dec(v_x_182_);
return v_res_187_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__1_splitter___redArg(lean_object* v_x_188_, lean_object* v_h__1_189_){
_start:
{
lean_object* v_fst_190_; lean_object* v_snd_191_; lean_object* v___x_192_; 
v_fst_190_ = lean_ctor_get(v_x_188_, 0);
lean_inc(v_fst_190_);
v_snd_191_ = lean_ctor_get(v_x_188_, 1);
lean_inc(v_snd_191_);
lean_dec_ref(v_x_188_);
v___x_192_ = lean_apply_2(v_h__1_189_, v_fst_190_, v_snd_191_);
return v___x_192_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_decodeChars_match__1_splitter(lean_object* v_motive_193_, lean_object* v_x_194_, lean_object* v_h__1_195_){
_start:
{
lean_object* v_fst_196_; lean_object* v_snd_197_; lean_object* v___x_198_; 
v_fst_196_ = lean_ctor_get(v_x_194_, 0);
lean_inc(v_fst_196_);
v_snd_197_ = lean_ctor_get(v_x_194_, 1);
lean_inc(v_snd_197_);
lean_dec_ref(v_x_194_);
v___x_198_ = lean_apply_2(v_h__1_195_, v_fst_196_, v_snd_197_);
return v___x_198_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_parseDigits(lean_object* v_x_199_, lean_object* v_x_200_){
_start:
{
if (lean_obj_tag(v_x_199_) == 0)
{
lean_object* v___x_201_; 
v___x_201_ = lean_alloc_ctor(1, 1, 0);
lean_ctor_set(v___x_201_, 0, v_x_200_);
return v___x_201_;
}
else
{
lean_object* v_head_202_; lean_object* v_tail_203_; lean_object* v___x_204_; uint32_t v___x_205_; lean_object* v___x_206_; uint8_t v___x_207_; 
v_head_202_ = lean_ctor_get(v_x_199_, 0);
v_tail_203_ = lean_ctor_get(v_x_199_, 1);
v___x_204_ = lean_unsigned_to_nat(48u);
v___x_205_ = lean_unbox_uint32(v_head_202_);
v___x_206_ = lean_uint32_to_nat(v___x_205_);
v___x_207_ = lean_nat_dec_le(v___x_204_, v___x_206_);
if (v___x_207_ == 0)
{
lean_object* v___x_208_; 
lean_dec(v___x_206_);
lean_dec(v_x_200_);
v___x_208_ = lean_box(0);
return v___x_208_;
}
else
{
lean_object* v___x_209_; uint8_t v___x_210_; 
v___x_209_ = lean_unsigned_to_nat(57u);
v___x_210_ = lean_nat_dec_le(v___x_206_, v___x_209_);
if (v___x_210_ == 0)
{
lean_object* v___x_211_; 
lean_dec(v___x_206_);
lean_dec(v_x_200_);
v___x_211_ = lean_box(0);
return v___x_211_;
}
else
{
lean_object* v___x_212_; lean_object* v___x_213_; lean_object* v___x_214_; lean_object* v___x_215_; 
v___x_212_ = lean_unsigned_to_nat(10u);
v___x_213_ = lean_nat_mul(v_x_200_, v___x_212_);
lean_dec(v_x_200_);
v___x_214_ = lean_nat_add(v___x_213_, v___x_206_);
lean_dec(v___x_206_);
lean_dec(v___x_213_);
v___x_215_ = lean_nat_sub(v___x_214_, v___x_204_);
lean_dec(v___x_214_);
v_x_199_ = v_tail_203_;
v_x_200_ = v___x_215_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_parseDigits___boxed(lean_object* v_x_217_, lean_object* v_x_218_){
_start:
{
lean_object* v_res_219_; 
v_res_219_ = lp_algalVerification_Algal_Core_Text_parseDigits(v_x_217_, v_x_218_);
lean_dec(v_x_217_);
return v_res_219_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_arrayIndex(lean_object* v_s_222_){
_start:
{
lean_object* v___x_223_; 
v___x_223_ = lean_string_data(v_s_222_);
if (lean_obj_tag(v___x_223_) == 0)
{
lean_object* v___x_224_; 
v___x_224_ = lean_box(0);
return v___x_224_;
}
else
{
lean_object* v_head_225_; lean_object* v_tail_226_; lean_object* v___x_228_; uint8_t v_isShared_229_; uint8_t v_isSharedCheck_250_; 
v_head_225_ = lean_ctor_get(v___x_223_, 0);
v_tail_226_ = lean_ctor_get(v___x_223_, 1);
v_isSharedCheck_250_ = !lean_is_exclusive(v___x_223_);
if (v_isSharedCheck_250_ == 0)
{
v___x_228_ = v___x_223_;
v_isShared_229_ = v_isSharedCheck_250_;
goto v_resetjp_227_;
}
else
{
lean_inc(v_tail_226_);
lean_inc(v_head_225_);
lean_dec(v___x_223_);
v___x_228_ = lean_box(0);
v_isShared_229_ = v_isSharedCheck_250_;
goto v_resetjp_227_;
}
v_resetjp_227_:
{
uint32_t v_c_231_; uint32_t v___x_245_; uint32_t v___x_246_; uint8_t v___x_247_; 
v___x_245_ = 48;
v___x_246_ = lean_unbox_uint32(v_head_225_);
v___x_247_ = lean_uint32_dec_eq(v___x_246_, v___x_245_);
if (v___x_247_ == 0)
{
uint32_t v___x_248_; 
v___x_248_ = lean_unbox_uint32(v_head_225_);
lean_dec(v_head_225_);
v_c_231_ = v___x_248_;
goto v___jp_230_;
}
else
{
lean_dec(v_head_225_);
if (lean_obj_tag(v_tail_226_) == 0)
{
lean_object* v___x_249_; 
lean_del_object(v___x_228_);
v___x_249_ = ((lean_object*)(lp_algalVerification_Algal_Core_Text_arrayIndex___closed__0));
return v___x_249_;
}
else
{
v_c_231_ = v___x_245_;
goto v___jp_230_;
}
}
v___jp_230_:
{
uint32_t v___x_232_; uint8_t v___x_233_; 
v___x_232_ = 48;
v___x_233_ = lean_uint32_dec_eq(v_c_231_, v___x_232_);
if (v___x_233_ == 0)
{
lean_object* v___x_234_; lean_object* v___x_236_; 
v___x_234_ = lean_box_uint32(v_c_231_);
if (v_isShared_229_ == 0)
{
lean_ctor_set(v___x_228_, 0, v___x_234_);
v___x_236_ = v___x_228_;
goto v_reusejp_235_;
}
else
{
lean_object* v_reuseFailAlloc_243_; 
v_reuseFailAlloc_243_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_243_, 0, v___x_234_);
lean_ctor_set(v_reuseFailAlloc_243_, 1, v_tail_226_);
v___x_236_ = v_reuseFailAlloc_243_;
goto v_reusejp_235_;
}
v_reusejp_235_:
{
lean_object* v___x_237_; lean_object* v___x_238_; 
v___x_237_ = lean_unsigned_to_nat(0u);
v___x_238_ = lp_algalVerification_Algal_Core_Text_parseDigits(v___x_236_, v___x_237_);
lean_dec_ref(v___x_236_);
if (lean_obj_tag(v___x_238_) == 0)
{
return v___x_238_;
}
else
{
lean_object* v_val_239_; lean_object* v___x_240_; uint8_t v___x_241_; 
v_val_239_ = lean_ctor_get(v___x_238_, 0);
lean_inc(v_val_239_);
v___x_240_ = lean_unsigned_to_nat(4294967295u);
v___x_241_ = lean_nat_dec_lt(v_val_239_, v___x_240_);
lean_dec(v_val_239_);
if (v___x_241_ == 0)
{
lean_object* v___x_242_; 
lean_dec_ref_known(v___x_238_, 1);
v___x_242_ = lean_box(0);
return v___x_242_;
}
else
{
return v___x_238_;
}
}
}
}
else
{
lean_object* v___x_244_; 
lean_del_object(v___x_228_);
lean_dec(v_tail_226_);
v___x_244_ = lean_box(0);
return v___x_244_;
}
}
}
}
}
}
LEAN_EXPORT uint8_t lp_algalVerification_List_compareLex___at___00Algal_Core_Text_keyOrder_spec__0(lean_object* v_x_251_, lean_object* v_x_252_){
_start:
{
if (lean_obj_tag(v_x_251_) == 0)
{
if (lean_obj_tag(v_x_252_) == 0)
{
uint8_t v___x_253_; 
v___x_253_ = 1;
return v___x_253_;
}
else
{
uint8_t v___x_254_; 
v___x_254_ = 0;
return v___x_254_;
}
}
else
{
if (lean_obj_tag(v_x_252_) == 0)
{
uint8_t v___x_255_; 
v___x_255_ = 2;
return v___x_255_;
}
else
{
lean_object* v_head_256_; lean_object* v_tail_257_; lean_object* v_head_258_; lean_object* v_tail_259_; uint8_t v___x_260_; 
v_head_256_ = lean_ctor_get(v_x_251_, 0);
v_tail_257_ = lean_ctor_get(v_x_251_, 1);
v_head_258_ = lean_ctor_get(v_x_252_, 0);
v_tail_259_ = lean_ctor_get(v_x_252_, 1);
v___x_260_ = lean_nat_dec_lt(v_head_256_, v_head_258_);
if (v___x_260_ == 0)
{
uint8_t v___x_261_; 
v___x_261_ = lean_nat_dec_eq(v_head_256_, v_head_258_);
if (v___x_261_ == 0)
{
uint8_t v___x_262_; 
v___x_262_ = 2;
return v___x_262_;
}
else
{
v_x_251_ = v_tail_257_;
v_x_252_ = v_tail_259_;
goto _start;
}
}
else
{
uint8_t v___x_264_; 
v___x_264_ = 0;
return v___x_264_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_compareLex___at___00Algal_Core_Text_keyOrder_spec__0___boxed(lean_object* v_x_265_, lean_object* v_x_266_){
_start:
{
uint8_t v_res_267_; lean_object* v_r_268_; 
v_res_267_ = lp_algalVerification_List_compareLex___at___00Algal_Core_Text_keyOrder_spec__0(v_x_265_, v_x_266_);
lean_dec(v_x_266_);
lean_dec(v_x_265_);
v_r_268_ = lean_box(v_res_267_);
return v_r_268_;
}
}
LEAN_EXPORT uint8_t lp_algalVerification_Algal_Core_Text_keyOrder(lean_object* v_a_269_, lean_object* v_b_270_){
_start:
{
lean_object* v___x_271_; 
lean_inc_ref(v_a_269_);
v___x_271_ = lp_algalVerification_Algal_Core_Text_arrayIndex(v_a_269_);
if (lean_obj_tag(v___x_271_) == 0)
{
lean_object* v___x_272_; 
lean_inc_ref(v_b_270_);
v___x_272_ = lp_algalVerification_Algal_Core_Text_arrayIndex(v_b_270_);
if (lean_obj_tag(v___x_272_) == 0)
{
lean_object* v___x_273_; lean_object* v___x_274_; uint8_t v___x_275_; 
v___x_273_ = lp_algalVerification_Algal_Core_Text_utf16(v_a_269_);
v___x_274_ = lp_algalVerification_Algal_Core_Text_utf16(v_b_270_);
v___x_275_ = lp_algalVerification_List_compareLex___at___00Algal_Core_Text_keyOrder_spec__0(v___x_273_, v___x_274_);
lean_dec(v___x_274_);
lean_dec(v___x_273_);
return v___x_275_;
}
else
{
uint8_t v___x_276_; 
lean_dec_ref_known(v___x_272_, 1);
lean_dec_ref(v_b_270_);
lean_dec_ref(v_a_269_);
v___x_276_ = 2;
return v___x_276_;
}
}
else
{
lean_object* v_val_277_; lean_object* v___x_278_; 
lean_dec_ref(v_a_269_);
v_val_277_ = lean_ctor_get(v___x_271_, 0);
lean_inc(v_val_277_);
lean_dec_ref_known(v___x_271_, 1);
v___x_278_ = lp_algalVerification_Algal_Core_Text_arrayIndex(v_b_270_);
if (lean_obj_tag(v___x_278_) == 0)
{
uint8_t v___x_279_; 
lean_dec(v_val_277_);
v___x_279_ = 0;
return v___x_279_;
}
else
{
lean_object* v_val_280_; uint8_t v___x_281_; 
v_val_280_ = lean_ctor_get(v___x_278_, 0);
lean_inc(v_val_280_);
lean_dec_ref_known(v___x_278_, 1);
v___x_281_ = lean_nat_dec_lt(v_val_277_, v_val_280_);
if (v___x_281_ == 0)
{
uint8_t v___x_282_; 
v___x_282_ = lean_nat_dec_eq(v_val_277_, v_val_280_);
lean_dec(v_val_280_);
lean_dec(v_val_277_);
if (v___x_282_ == 0)
{
uint8_t v___x_283_; 
v___x_283_ = 2;
return v___x_283_;
}
else
{
uint8_t v___x_284_; 
v___x_284_ = 1;
return v___x_284_;
}
}
else
{
uint8_t v___x_285_; 
lean_dec(v_val_280_);
lean_dec(v_val_277_);
v___x_285_ = 0;
return v___x_285_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_keyOrder___boxed(lean_object* v_a_286_, lean_object* v_b_287_){
_start:
{
uint8_t v_res_288_; lean_object* v_r_289_; 
v_res_288_ = lp_algalVerification_Algal_Core_Text_keyOrder(v_a_286_, v_b_287_);
v_r_289_ = lean_box(v_res_288_);
return v_r_289_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_insertKey(lean_object* v_key_290_, lean_object* v_x_291_){
_start:
{
if (lean_obj_tag(v_x_291_) == 0)
{
lean_object* v___x_292_; 
v___x_292_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_292_, 0, v_key_290_);
lean_ctor_set(v___x_292_, 1, v_x_291_);
return v___x_292_;
}
else
{
lean_object* v_head_293_; lean_object* v_tail_294_; uint8_t v___x_295_; uint8_t v___x_296_; uint8_t v___x_297_; 
v_head_293_ = lean_ctor_get(v_x_291_, 0);
v_tail_294_ = lean_ctor_get(v_x_291_, 1);
lean_inc(v_head_293_);
lean_inc_ref(v_key_290_);
v___x_295_ = lp_algalVerification_Algal_Core_Text_keyOrder(v_key_290_, v_head_293_);
v___x_296_ = 2;
v___x_297_ = l_instDecidableEqOrdering(v___x_295_, v___x_296_);
if (v___x_297_ == 0)
{
lean_object* v___x_298_; 
v___x_298_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v___x_298_, 0, v_key_290_);
lean_ctor_set(v___x_298_, 1, v_x_291_);
return v___x_298_;
}
else
{
lean_object* v___x_300_; uint8_t v_isShared_301_; uint8_t v_isSharedCheck_306_; 
lean_inc(v_tail_294_);
lean_inc(v_head_293_);
v_isSharedCheck_306_ = !lean_is_exclusive(v_x_291_);
if (v_isSharedCheck_306_ == 0)
{
lean_object* v_unused_307_; lean_object* v_unused_308_; 
v_unused_307_ = lean_ctor_get(v_x_291_, 1);
lean_dec(v_unused_307_);
v_unused_308_ = lean_ctor_get(v_x_291_, 0);
lean_dec(v_unused_308_);
v___x_300_ = v_x_291_;
v_isShared_301_ = v_isSharedCheck_306_;
goto v_resetjp_299_;
}
else
{
lean_dec(v_x_291_);
v___x_300_ = lean_box(0);
v_isShared_301_ = v_isSharedCheck_306_;
goto v_resetjp_299_;
}
v_resetjp_299_:
{
lean_object* v___x_302_; lean_object* v___x_304_; 
v___x_302_ = lp_algalVerification_Algal_Core_Text_insertKey(v_key_290_, v_tail_294_);
if (v_isShared_301_ == 0)
{
lean_ctor_set(v___x_300_, 1, v___x_302_);
v___x_304_ = v___x_300_;
goto v_reusejp_303_;
}
else
{
lean_object* v_reuseFailAlloc_305_; 
v_reuseFailAlloc_305_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_305_, 0, v_head_293_);
lean_ctor_set(v_reuseFailAlloc_305_, 1, v___x_302_);
v___x_304_ = v_reuseFailAlloc_305_;
goto v_reusejp_303_;
}
v_reusejp_303_:
{
return v___x_304_;
}
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_Text_canonicalKeys(lean_object* v_x_309_){
_start:
{
if (lean_obj_tag(v_x_309_) == 0)
{
return v_x_309_;
}
else
{
lean_object* v_head_310_; lean_object* v_tail_311_; lean_object* v___x_312_; lean_object* v___x_313_; 
v_head_310_ = lean_ctor_get(v_x_309_, 0);
lean_inc(v_head_310_);
v_tail_311_ = lean_ctor_get(v_x_309_, 1);
lean_inc(v_tail_311_);
lean_dec_ref_known(v_x_309_, 2);
v___x_312_ = lp_algalVerification_Algal_Core_Text_canonicalKeys(v_tail_311_);
v___x_313_ = lp_algalVerification_Algal_Core_Text_insertKey(v_head_310_, v___x_312_);
return v___x_313_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_insertKey_match__1_splitter___redArg(lean_object* v_x_314_, lean_object* v_h__1_315_, lean_object* v_h__2_316_){
_start:
{
if (lean_obj_tag(v_x_314_) == 0)
{
lean_object* v___x_317_; lean_object* v___x_318_; 
lean_dec(v_h__2_316_);
v___x_317_ = lean_box(0);
v___x_318_ = lean_apply_1(v_h__1_315_, v___x_317_);
return v___x_318_;
}
else
{
lean_object* v_head_319_; lean_object* v_tail_320_; lean_object* v___x_321_; 
lean_dec(v_h__1_315_);
v_head_319_ = lean_ctor_get(v_x_314_, 0);
lean_inc(v_head_319_);
v_tail_320_ = lean_ctor_get(v_x_314_, 1);
lean_inc(v_tail_320_);
lean_dec_ref_known(v_x_314_, 2);
v___x_321_ = lean_apply_2(v_h__2_316_, v_head_319_, v_tail_320_);
return v___x_321_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_Text_0__Algal_Core_Text_insertKey_match__1_splitter(lean_object* v_motive_322_, lean_object* v_x_323_, lean_object* v_h__1_324_, lean_object* v_h__2_325_){
_start:
{
if (lean_obj_tag(v_x_323_) == 0)
{
lean_object* v___x_326_; lean_object* v___x_327_; 
lean_dec(v_h__2_325_);
v___x_326_ = lean_box(0);
v___x_327_ = lean_apply_1(v_h__1_324_, v___x_326_);
return v___x_327_;
}
else
{
lean_object* v_head_328_; lean_object* v_tail_329_; lean_object* v___x_330_; 
lean_dec(v_h__1_324_);
v_head_328_ = lean_ctor_get(v_x_323_, 0);
lean_inc(v_head_328_);
v_tail_329_ = lean_ctor_get(v_x_323_, 1);
lean_inc(v_tail_329_);
lean_dec_ref_known(v_x_323_, 2);
v___x_330_ = lean_apply_2(v_h__2_325_, v_head_328_, v_tail_329_);
return v___x_330_;
}
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_Text(uint8_t builtin) {
lean_object * res;
if (_G_initialized) return lean_io_result_mk_ok(lean_box(0));
_G_initialized = true;
lean_initialize_runtime_module();
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
