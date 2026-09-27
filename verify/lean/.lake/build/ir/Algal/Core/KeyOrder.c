// Lean compiler output
// Module: Algal.Core.KeyOrder
// Imports: public import Init public meta import Init public import Algal.Core.Text public import Algal.Core.OwnMap public import Init.Data.Nat.ToString public import Init.Data.Order.Ord
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
lean_object* l_List_reverse___redArg(lean_object*);
lean_object* l_String_decEq___boxed(lean_object*, lean_object*);
lean_object* l_List_eraseDupsBy___redArg(lean_object*, lean_object*);
lean_object* lp_algalVerification_Algal_Core_Text_canonicalKeys(lean_object*);
lean_object* lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(lean_object*, lean_object*);
uint8_t lean_uint32_dec_eq(uint32_t, uint32_t);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_parseDigits_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_parseDigits_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__3_splitter___redArg___boxed__const__1;
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__3_splitter___redArg(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__3_splitter(lean_object*, lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_insertKey_match__1_splitter___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_insertKey_match__1_splitter(lean_object*, lean_object*, lean_object*, lean_object*);
static const lean_closure_object lp_algalVerification_List_eraseDups___at___00Algal_Core_KeyOrder_support_spec__1___closed__0_value = {.m_header = {.m_rc = 0, .m_cs_sz = sizeof(lean_closure_object) + sizeof(void*)*0, .m_other = 0, .m_tag = 245}, .m_fun = (void*)l_String_decEq___boxed, .m_arity = 2, .m_num_fixed = 0, .m_objs = {} };
static const lean_object* lp_algalVerification_List_eraseDups___at___00Algal_Core_KeyOrder_support_spec__1___closed__0 = (const lean_object*)&lp_algalVerification_List_eraseDups___at___00Algal_Core_KeyOrder_support_spec__1___closed__0_value;
LEAN_EXPORT lean_object* lp_algalVerification_List_eraseDups___at___00Algal_Core_KeyOrder_support_spec__1(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_support_spec__0___redArg(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_KeyOrder_support___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_KeyOrder_support(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_support_spec__0(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_canonicalProjection_spec__0___redArg(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_canonicalProjection_spec__0___redArg___boxed(lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_KeyOrder_canonicalProjection___redArg(lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_KeyOrder_canonicalProjection(lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_canonicalProjection_spec__0(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_canonicalProjection_spec__0___boxed(lean_object*, lean_object*, lean_object*, lean_object*);
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_parseDigits_match__1_splitter___redArg(lean_object* v_x_1_, lean_object* v_x_2_, lean_object* v_h__1_3_, lean_object* v_h__2_4_){
_start:
{
if (lean_obj_tag(v_x_1_) == 0)
{
lean_object* v___x_5_; 
lean_dec(v_h__2_4_);
v___x_5_ = lean_apply_1(v_h__1_3_, v_x_2_);
return v___x_5_;
}
else
{
lean_object* v_head_6_; lean_object* v_tail_7_; lean_object* v___x_8_; 
lean_dec(v_h__1_3_);
v_head_6_ = lean_ctor_get(v_x_1_, 0);
lean_inc(v_head_6_);
v_tail_7_ = lean_ctor_get(v_x_1_, 1);
lean_inc(v_tail_7_);
lean_dec_ref_known(v_x_1_, 2);
v___x_8_ = lean_apply_3(v_h__2_4_, v_head_6_, v_tail_7_, v_x_2_);
return v___x_8_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_parseDigits_match__1_splitter(lean_object* v_motive_9_, lean_object* v_x_10_, lean_object* v_x_11_, lean_object* v_h__1_12_, lean_object* v_h__2_13_){
_start:
{
if (lean_obj_tag(v_x_10_) == 0)
{
lean_object* v___x_14_; 
lean_dec(v_h__2_13_);
v___x_14_ = lean_apply_1(v_h__1_12_, v_x_11_);
return v___x_14_;
}
else
{
lean_object* v_head_15_; lean_object* v_tail_16_; lean_object* v___x_17_; 
lean_dec(v_h__1_12_);
v_head_15_ = lean_ctor_get(v_x_10_, 0);
lean_inc(v_head_15_);
v_tail_16_ = lean_ctor_get(v_x_10_, 1);
lean_inc(v_tail_16_);
lean_dec_ref_known(v_x_10_, 2);
v___x_17_ = lean_apply_3(v_h__2_13_, v_head_15_, v_tail_16_, v_x_11_);
return v___x_17_;
}
}
}
static lean_object* _init_lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__3_splitter___redArg___boxed__const__1(void){
_start:
{
uint32_t v___x_18_; lean_object* v___x_19_; 
v___x_18_ = 48;
v___x_19_ = lean_box_uint32(v___x_18_);
return v___x_19_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__3_splitter___redArg(lean_object* v_x_20_, lean_object* v_h__1_21_, lean_object* v_h__2_22_, lean_object* v_h__3_23_){
_start:
{
if (lean_obj_tag(v_x_20_) == 0)
{
lean_object* v___x_24_; lean_object* v___x_25_; 
lean_dec(v_h__3_23_);
lean_dec(v_h__2_22_);
v___x_24_ = lean_box(0);
v___x_25_ = lean_apply_1(v_h__1_21_, v___x_24_);
return v___x_25_;
}
else
{
lean_object* v_head_26_; lean_object* v_tail_27_; uint32_t v___x_28_; uint32_t v___x_29_; uint8_t v___x_30_; 
lean_dec(v_h__1_21_);
v_head_26_ = lean_ctor_get(v_x_20_, 0);
lean_inc(v_head_26_);
v_tail_27_ = lean_ctor_get(v_x_20_, 1);
lean_inc(v_tail_27_);
lean_dec_ref_known(v_x_20_, 2);
v___x_28_ = 48;
v___x_29_ = lean_unbox_uint32(v_head_26_);
v___x_30_ = lean_uint32_dec_eq(v___x_29_, v___x_28_);
if (v___x_30_ == 0)
{
lean_object* v___x_31_; 
lean_dec(v_h__2_22_);
v___x_31_ = lean_apply_3(v_h__3_23_, v_head_26_, v_tail_27_, lean_box(0));
return v___x_31_;
}
else
{
lean_dec(v_head_26_);
if (lean_obj_tag(v_tail_27_) == 0)
{
lean_object* v___x_32_; lean_object* v___x_33_; 
lean_dec(v_h__3_23_);
v___x_32_ = lean_box(0);
v___x_33_ = lean_apply_1(v_h__2_22_, v___x_32_);
return v___x_33_;
}
else
{
lean_object* v___x_34_; lean_object* v___x_35_; 
lean_dec(v_h__2_22_);
v___x_34_ = lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__3_splitter___redArg___boxed__const__1;
v___x_35_ = lean_apply_3(v_h__3_23_, v___x_34_, v_tail_27_, lean_box(0));
return v___x_35_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__3_splitter(lean_object* v_motive_36_, lean_object* v_x_37_, lean_object* v_h__1_38_, lean_object* v_h__2_39_, lean_object* v_h__3_40_){
_start:
{
if (lean_obj_tag(v_x_37_) == 0)
{
lean_object* v___x_41_; lean_object* v___x_42_; 
lean_dec(v_h__3_40_);
lean_dec(v_h__2_39_);
v___x_41_ = lean_box(0);
v___x_42_ = lean_apply_1(v_h__1_38_, v___x_41_);
return v___x_42_;
}
else
{
lean_object* v_head_43_; lean_object* v_tail_44_; uint32_t v___x_45_; uint32_t v___x_46_; uint8_t v___x_47_; 
lean_dec(v_h__1_38_);
v_head_43_ = lean_ctor_get(v_x_37_, 0);
lean_inc(v_head_43_);
v_tail_44_ = lean_ctor_get(v_x_37_, 1);
lean_inc(v_tail_44_);
lean_dec_ref_known(v_x_37_, 2);
v___x_45_ = 48;
v___x_46_ = lean_unbox_uint32(v_head_43_);
v___x_47_ = lean_uint32_dec_eq(v___x_46_, v___x_45_);
if (v___x_47_ == 0)
{
lean_object* v___x_48_; 
lean_dec(v_h__2_39_);
v___x_48_ = lean_apply_3(v_h__3_40_, v_head_43_, v_tail_44_, lean_box(0));
return v___x_48_;
}
else
{
lean_dec(v_head_43_);
if (lean_obj_tag(v_tail_44_) == 0)
{
lean_object* v___x_49_; lean_object* v___x_50_; 
lean_dec(v_h__3_40_);
v___x_49_ = lean_box(0);
v___x_50_ = lean_apply_1(v_h__2_39_, v___x_49_);
return v___x_50_;
}
else
{
lean_object* v___x_51_; lean_object* v___x_52_; 
lean_dec(v_h__2_39_);
v___x_51_ = lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__3_splitter___redArg___boxed__const__1;
v___x_52_ = lean_apply_3(v_h__3_40_, v___x_51_, v_tail_44_, lean_box(0));
return v___x_52_;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__1_splitter___redArg(lean_object* v_x_53_, lean_object* v_h__1_54_, lean_object* v_h__2_55_){
_start:
{
if (lean_obj_tag(v_x_53_) == 0)
{
lean_object* v___x_56_; lean_object* v___x_57_; 
lean_dec(v_h__2_55_);
v___x_56_ = lean_box(0);
v___x_57_ = lean_apply_1(v_h__1_54_, v___x_56_);
return v___x_57_;
}
else
{
lean_object* v_val_58_; lean_object* v___x_59_; 
lean_dec(v_h__1_54_);
v_val_58_ = lean_ctor_get(v_x_53_, 0);
lean_inc(v_val_58_);
lean_dec_ref_known(v_x_53_, 1);
v___x_59_ = lean_apply_1(v_h__2_55_, v_val_58_);
return v___x_59_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__1_splitter(lean_object* v_motive_60_, lean_object* v_x_61_, lean_object* v_h__1_62_, lean_object* v_h__2_63_){
_start:
{
if (lean_obj_tag(v_x_61_) == 0)
{
lean_object* v___x_64_; lean_object* v___x_65_; 
lean_dec(v_h__2_63_);
v___x_64_ = lean_box(0);
v___x_65_ = lean_apply_1(v_h__1_62_, v___x_64_);
return v___x_65_;
}
else
{
lean_object* v_val_66_; lean_object* v___x_67_; 
lean_dec(v_h__1_62_);
v_val_66_ = lean_ctor_get(v_x_61_, 0);
lean_inc(v_val_66_);
lean_dec_ref_known(v_x_61_, 1);
v___x_67_ = lean_apply_1(v_h__2_63_, v_val_66_);
return v___x_67_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_insertKey_match__1_splitter___redArg(lean_object* v_x_68_, lean_object* v_h__1_69_, lean_object* v_h__2_70_){
_start:
{
if (lean_obj_tag(v_x_68_) == 0)
{
lean_object* v___x_71_; lean_object* v___x_72_; 
lean_dec(v_h__2_70_);
v___x_71_ = lean_box(0);
v___x_72_ = lean_apply_1(v_h__1_69_, v___x_71_);
return v___x_72_;
}
else
{
lean_object* v_head_73_; lean_object* v_tail_74_; lean_object* v___x_75_; 
lean_dec(v_h__1_69_);
v_head_73_ = lean_ctor_get(v_x_68_, 0);
lean_inc(v_head_73_);
v_tail_74_ = lean_ctor_get(v_x_68_, 1);
lean_inc(v_tail_74_);
lean_dec_ref_known(v_x_68_, 2);
v___x_75_ = lean_apply_2(v_h__2_70_, v_head_73_, v_tail_74_);
return v___x_75_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_insertKey_match__1_splitter(lean_object* v_motive_76_, lean_object* v_x_77_, lean_object* v_h__1_78_, lean_object* v_h__2_79_){
_start:
{
if (lean_obj_tag(v_x_77_) == 0)
{
lean_object* v___x_80_; lean_object* v___x_81_; 
lean_dec(v_h__2_79_);
v___x_80_ = lean_box(0);
v___x_81_ = lean_apply_1(v_h__1_78_, v___x_80_);
return v___x_81_;
}
else
{
lean_object* v_head_82_; lean_object* v_tail_83_; lean_object* v___x_84_; 
lean_dec(v_h__1_78_);
v_head_82_ = lean_ctor_get(v_x_77_, 0);
lean_inc(v_head_82_);
v_tail_83_ = lean_ctor_get(v_x_77_, 1);
lean_inc(v_tail_83_);
lean_dec_ref_known(v_x_77_, 2);
v___x_84_ = lean_apply_2(v_h__2_79_, v_head_82_, v_tail_83_);
return v___x_84_;
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_eraseDups___at___00Algal_Core_KeyOrder_support_spec__1(lean_object* v_as_86_){
_start:
{
lean_object* v___f_87_; lean_object* v___x_88_; 
v___f_87_ = ((lean_object*)(lp_algalVerification_List_eraseDups___at___00Algal_Core_KeyOrder_support_spec__1___closed__0));
v___x_88_ = l_List_eraseDupsBy___redArg(v___f_87_, v_as_86_);
return v___x_88_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_support_spec__0___redArg(lean_object* v_a_89_, lean_object* v_a_90_){
_start:
{
if (lean_obj_tag(v_a_89_) == 0)
{
lean_object* v___x_91_; 
v___x_91_ = l_List_reverse___redArg(v_a_90_);
return v___x_91_;
}
else
{
lean_object* v_head_92_; lean_object* v_tail_93_; lean_object* v___x_95_; uint8_t v_isShared_96_; uint8_t v_isSharedCheck_102_; 
v_head_92_ = lean_ctor_get(v_a_89_, 0);
v_tail_93_ = lean_ctor_get(v_a_89_, 1);
v_isSharedCheck_102_ = !lean_is_exclusive(v_a_89_);
if (v_isSharedCheck_102_ == 0)
{
v___x_95_ = v_a_89_;
v_isShared_96_ = v_isSharedCheck_102_;
goto v_resetjp_94_;
}
else
{
lean_inc(v_tail_93_);
lean_inc(v_head_92_);
lean_dec(v_a_89_);
v___x_95_ = lean_box(0);
v_isShared_96_ = v_isSharedCheck_102_;
goto v_resetjp_94_;
}
v_resetjp_94_:
{
lean_object* v_fst_97_; lean_object* v___x_99_; 
v_fst_97_ = lean_ctor_get(v_head_92_, 0);
lean_inc(v_fst_97_);
lean_dec(v_head_92_);
if (v_isShared_96_ == 0)
{
lean_ctor_set(v___x_95_, 1, v_a_90_);
lean_ctor_set(v___x_95_, 0, v_fst_97_);
v___x_99_ = v___x_95_;
goto v_reusejp_98_;
}
else
{
lean_object* v_reuseFailAlloc_101_; 
v_reuseFailAlloc_101_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_101_, 0, v_fst_97_);
lean_ctor_set(v_reuseFailAlloc_101_, 1, v_a_90_);
v___x_99_ = v_reuseFailAlloc_101_;
goto v_reusejp_98_;
}
v_reusejp_98_:
{
v_a_89_ = v_tail_93_;
v_a_90_ = v___x_99_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_KeyOrder_support___redArg(lean_object* v_entries_103_){
_start:
{
lean_object* v___x_104_; lean_object* v___x_105_; lean_object* v___x_106_; 
v___x_104_ = lean_box(0);
v___x_105_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_support_spec__0___redArg(v_entries_103_, v___x_104_);
v___x_106_ = lp_algalVerification_List_eraseDups___at___00Algal_Core_KeyOrder_support_spec__1(v___x_105_);
return v___x_106_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_KeyOrder_support(lean_object* v_00_u03b1_107_, lean_object* v_entries_108_){
_start:
{
lean_object* v___x_109_; 
v___x_109_ = lp_algalVerification_Algal_Core_KeyOrder_support___redArg(v_entries_108_);
return v___x_109_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_support_spec__0(lean_object* v_00_u03b1_110_, lean_object* v_a_111_, lean_object* v_a_112_){
_start:
{
lean_object* v___x_113_; 
v___x_113_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_support_spec__0___redArg(v_a_111_, v_a_112_);
return v___x_113_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_canonicalProjection_spec__0___redArg(lean_object* v_entries_114_, lean_object* v_a_115_, lean_object* v_a_116_){
_start:
{
if (lean_obj_tag(v_a_115_) == 0)
{
lean_object* v___x_117_; 
v___x_117_ = l_List_reverse___redArg(v_a_116_);
return v___x_117_;
}
else
{
lean_object* v_head_118_; lean_object* v_tail_119_; lean_object* v___x_121_; uint8_t v_isShared_122_; uint8_t v_isSharedCheck_129_; 
v_head_118_ = lean_ctor_get(v_a_115_, 0);
v_tail_119_ = lean_ctor_get(v_a_115_, 1);
v_isSharedCheck_129_ = !lean_is_exclusive(v_a_115_);
if (v_isSharedCheck_129_ == 0)
{
v___x_121_ = v_a_115_;
v_isShared_122_ = v_isSharedCheck_129_;
goto v_resetjp_120_;
}
else
{
lean_inc(v_tail_119_);
lean_inc(v_head_118_);
lean_dec(v_a_115_);
v___x_121_ = lean_box(0);
v_isShared_122_ = v_isSharedCheck_129_;
goto v_resetjp_120_;
}
v_resetjp_120_:
{
lean_object* v___x_123_; lean_object* v___x_124_; lean_object* v___x_126_; 
v___x_123_ = lp_algalVerification_Algal_Core_OwnMap_lookup___redArg(v_entries_114_, v_head_118_);
v___x_124_ = lean_alloc_ctor(0, 2, 0);
lean_ctor_set(v___x_124_, 0, v_head_118_);
lean_ctor_set(v___x_124_, 1, v___x_123_);
if (v_isShared_122_ == 0)
{
lean_ctor_set(v___x_121_, 1, v_a_116_);
lean_ctor_set(v___x_121_, 0, v___x_124_);
v___x_126_ = v___x_121_;
goto v_reusejp_125_;
}
else
{
lean_object* v_reuseFailAlloc_128_; 
v_reuseFailAlloc_128_ = lean_alloc_ctor(1, 2, 0);
lean_ctor_set(v_reuseFailAlloc_128_, 0, v___x_124_);
lean_ctor_set(v_reuseFailAlloc_128_, 1, v_a_116_);
v___x_126_ = v_reuseFailAlloc_128_;
goto v_reusejp_125_;
}
v_reusejp_125_:
{
v_a_115_ = v_tail_119_;
v_a_116_ = v___x_126_;
goto _start;
}
}
}
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_canonicalProjection_spec__0___redArg___boxed(lean_object* v_entries_130_, lean_object* v_a_131_, lean_object* v_a_132_){
_start:
{
lean_object* v_res_133_; 
v_res_133_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_canonicalProjection_spec__0___redArg(v_entries_130_, v_a_131_, v_a_132_);
lean_dec(v_entries_130_);
return v_res_133_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_KeyOrder_canonicalProjection___redArg(lean_object* v_entries_134_){
_start:
{
lean_object* v___x_135_; lean_object* v___x_136_; lean_object* v___x_137_; lean_object* v___x_138_; 
lean_inc(v_entries_134_);
v___x_135_ = lp_algalVerification_Algal_Core_KeyOrder_support___redArg(v_entries_134_);
v___x_136_ = lp_algalVerification_Algal_Core_Text_canonicalKeys(v___x_135_);
v___x_137_ = lean_box(0);
v___x_138_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_canonicalProjection_spec__0___redArg(v_entries_134_, v___x_136_, v___x_137_);
lean_dec(v_entries_134_);
return v___x_138_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_Algal_Core_KeyOrder_canonicalProjection(lean_object* v_00_u03b1_139_, lean_object* v_entries_140_){
_start:
{
lean_object* v___x_141_; 
v___x_141_ = lp_algalVerification_Algal_Core_KeyOrder_canonicalProjection___redArg(v_entries_140_);
return v___x_141_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_canonicalProjection_spec__0(lean_object* v_00_u03b1_142_, lean_object* v_entries_143_, lean_object* v_a_144_, lean_object* v_a_145_){
_start:
{
lean_object* v___x_146_; 
v___x_146_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_canonicalProjection_spec__0___redArg(v_entries_143_, v_a_144_, v_a_145_);
return v___x_146_;
}
}
LEAN_EXPORT lean_object* lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_canonicalProjection_spec__0___boxed(lean_object* v_00_u03b1_147_, lean_object* v_entries_148_, lean_object* v_a_149_, lean_object* v_a_150_){
_start:
{
lean_object* v_res_151_; 
v_res_151_ = lp_algalVerification_List_mapTR_loop___at___00Algal_Core_KeyOrder_canonicalProjection_spec__0(v_00_u03b1_147_, v_entries_148_, v_a_149_, v_a_150_);
lean_dec(v_entries_148_);
return v_res_151_;
}
}
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_Init(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_Text(uint8_t builtin);
lean_object* initialize_algalVerification_Algal_Core_OwnMap(uint8_t builtin);
lean_object* initialize_Init_Data_Nat_ToString(uint8_t builtin);
lean_object* initialize_Init_Data_Order_Ord(uint8_t builtin);
void lean_initialize_runtime_module();
static bool _G_initialized = false;
LEAN_EXPORT lean_object* initialize_algalVerification_Algal_Core_KeyOrder(uint8_t builtin) {
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
res = initialize_algalVerification_Algal_Core_Text(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_algalVerification_Algal_Core_OwnMap(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Data_Nat_ToString(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
res = initialize_Init_Data_Order_Ord(builtin);
if (lean_io_result_is_error(res)) return res;
lean_dec_ref(res);
lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__3_splitter___redArg___boxed__const__1 = _init_lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__3_splitter___redArg___boxed__const__1();
lean_mark_persistent(lp_algalVerification___private_Algal_Core_KeyOrder_0__Algal_Core_Text_arrayIndex_match__3_splitter___redArg___boxed__const__1);
return lean_io_result_mk_ok(lean_box(0));
}
#ifdef __cplusplus
}
#endif
